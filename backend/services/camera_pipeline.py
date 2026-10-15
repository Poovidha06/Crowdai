import os
import cv2
import numpy as np
import time
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple

from backend.services.yolo_detector import YOLODetector
from backend.services.alert_engine import alert_engine

logger = logging.getLogger("camera_pipeline")

# Shared YOLO Detector instance to save memory and warm up model once
_shared_yolo_instance: Optional[YOLODetector] = None

def get_shared_yolo() -> YOLODetector:
    global _shared_yolo_instance
    if _shared_yolo_instance is None:
        _shared_yolo_instance = YOLODetector()
    return _shared_yolo_instance

# Global semaphore to limit concurrent CPU-bound YOLO inferences across all cameras
_yolo_semaphore: Optional[asyncio.Semaphore] = None

def get_yolo_semaphore() -> asyncio.Semaphore:
    global _yolo_semaphore
    if _yolo_semaphore is None:
        _yolo_semaphore = asyncio.Semaphore(2)
    return _yolo_semaphore

DEFAULT_SAMPLE_VIDEO = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "uploads", "input_video.mp4")
)


class CameraPipeline:
    """
    Independent real-world AI detection and video processing pipeline for a single camera point.
    Each camera connects to a real video source (webcam, RTSP stream, or real CCTV surveillance video),
    runs YOLOv8 person detection on real frames, and calculates real people count, occupancy,
    safety status, detection confidence, processing FPS, time-series history, and active alerts.
    
    Utilizes off-thread asynchronous inference via asyncio.to_thread and adaptive pacing
    so background cameras do not starve the event loop or peg the CPU.
    """
    def __init__(
        self,
        camera_id: str,
        name: str,
        region_id: str = "reg-entire-campus",
        region_name: str = "Campus Area",
        monitoring_zone: str = "General Monitoring",
        capacity: int = 100,
        warning_threshold: float = 75.0,
        critical_threshold: float = 90.0,
        initial_status: str = "live",
        source_type: str = "real_footage",
        source_path: Optional[str] = None
    ):
        self.camera_id = camera_id
        self.name = name
        self.region_id = region_id
        self.region_name = region_name
        self.monitoring_zone = monitoring_zone
        self.capacity = max(1, capacity)
        self.warning_threshold = warning_threshold
        self.critical_threshold = critical_threshold

        # Source configuration
        self.source_type: str = source_type  # "webcam", "file", "rtsp", "real_footage"
        self.source_path: Optional[str] = source_path
        self.cap: Optional[cv2.VideoCapture] = None
        self.connection_status: str = initial_status  # "live", "offline", "reconnecting"

        # Unique starting offset so multiple camera points viewing default surveillance footage
        # show different time segments
        seed_hash = sum(ord(c) for c in camera_id)
        self._initial_frame_offset = (seed_hash * 43) % 250
        self._frame_count_total = 0

        # AI & Telemetry metrics (derived from real YOLOv8 inference)
        self.people_count: int = 0
        self.occupancy: float = 0.0
        self.crowd_status: str = "Normal"  # "Normal", "Warning", "Critical"
        self.fps: float = 16.0
        self.detection_confidence: float = 0.88
        self.last_processed_time: str = datetime.utcnow().isoformat()
        self.last_frame_bytes: Optional[bytes] = None

        # Camera-specific alerts
        self.active_alerts: List[Dict[str, Any]] = []

        # History buffer for real-time trend chart (last 30 samples)
        self.trend_history: List[Dict[str, Any]] = []
        self._init_trend_history()

        # Stream access tracking for adaptive pacing
        self._last_stream_accessed_at: float = time.time()

        # Pipeline runtime
        self._is_running = True
        self._task: Optional[asyncio.Task] = None

        # Initialize hardware/file capture
        self._open_capture()

    def mark_active_streaming(self):
        """Notify pipeline that an active video client or dashboard is currently viewing this camera."""
        self._last_stream_accessed_at = time.time()

    def _init_trend_history(self):
        """Populate initial past trend points so trend charts render immediately."""
        now = datetime.utcnow()
        for i in range(12, -1, -1):
            t = now - timedelta(seconds=i * 5)
            p = max(0, int(self.capacity * 0.25))
            occ = round((p / self.capacity) * 100, 1)
            st = "Normal" if occ < self.warning_threshold else ("Warning" if occ < self.critical_threshold else "Critical")
            self.trend_history.append({
                "time": t.strftime("%H:%M:%S"),
                "people": p,
                "occupancy": occ,
                "status": st
            })

    def _open_capture(self):
        """Open VideoCapture based on configured source_type."""
        try:
            if self.cap:
                try:
                    self.cap.release()
                except Exception:
                    pass
                self.cap = None

            if self.source_type == "webcam":
                dev_idx = int(self.source_path or 0)
                logger.info(f"Opening webcam index {dev_idx} for camera {self.camera_id}")
                try:
                    self.cap = cv2.VideoCapture(dev_idx, cv2.CAP_DSHOW)
                except Exception:
                    self.cap = cv2.VideoCapture(dev_idx)

                if not self.cap or not self.cap.isOpened():
                    logger.warning(f"Webcam {dev_idx} unavailable; falling back to real CCTV footage for {self.camera_id}")
                    if os.path.exists(DEFAULT_SAMPLE_VIDEO):
                        self.source_type = "real_footage"
                        self.source_path = DEFAULT_SAMPLE_VIDEO
                        self.cap = cv2.VideoCapture(DEFAULT_SAMPLE_VIDEO)
            elif self.source_type in ("rtsp", "stream") and self.source_path:
                logger.info(f"Opening RTSP/HTTP stream {self.source_path} for camera {self.camera_id}")
                self.cap = cv2.VideoCapture(self.source_path)
            elif self.source_type == "file" and self.source_path and os.path.exists(self.source_path):
                logger.info(f"Opening video file {self.source_path} for camera {self.camera_id}")
                self.cap = cv2.VideoCapture(self.source_path)
            else:
                # Default real surveillance footage
                if os.path.exists(DEFAULT_SAMPLE_VIDEO):
                    self.source_type = "real_footage"
                    self.source_path = DEFAULT_SAMPLE_VIDEO
                    self.cap = cv2.VideoCapture(DEFAULT_SAMPLE_VIDEO)

            if self.cap and self.cap.isOpened():
                if self.source_type in ("file", "real_footage"):
                    self._frame_count_total = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT) or 340)
                    if self._frame_count_total > 30:
                        start_f = self._initial_frame_offset % max(1, (self._frame_count_total - 20))
                        self.cap.set(cv2.CAP_PROP_POS_FRAMES, start_f)
                self.connection_status = "live"
            else:
                logger.warning(f"VideoCapture not opened for camera {self.camera_id}; set to reconnecting.")
                self.connection_status = "reconnecting"
        except Exception as e:
            logger.error(f"Error opening capture for camera {self.camera_id}: {e}")
            self.connection_status = "reconnecting"

    def start_pipeline(self):
        """Start async pipeline evaluation loop safely if event loop exists."""
        if self._task is None or self._task.done():
            self._is_running = True
            try:
                loop = asyncio.get_running_loop()
                self._task = loop.create_task(self._run_loop())
            except RuntimeError:
                pass

    async def _run_loop(self):
        """Main async pipeline loop running real-time YOLOv8 inference off-thread."""
        while self._is_running:
            try:
                if self.connection_status == "live":
                    if self.cap and self.cap.isOpened():
                        await self._process_real_frame()
                    else:
                        self._open_capture()
                        await asyncio.sleep(0.5)
                elif self.connection_status == "reconnecting":
                    # Attempt reconnection to video source
                    await asyncio.sleep(2.0)
                    self._open_capture()
                else:
                    # Offline state - generate offline placeholder banner
                    self._generate_offline_frame()
                    await asyncio.sleep(1.0)
            except Exception as e:
                logger.error(f"Error in pipeline loop for {self.camera_id}: {e}")
                await asyncio.sleep(1.0)

            # Adaptive pacing:
            # Active video feed (accessed in last 4 seconds) -> ~6-8 FPS smooth video
            # Background / idle camera -> sample once every 2.5 seconds to conserve CPU
            is_active_streaming = (time.time() - self._last_stream_accessed_at) < 4.0
            if is_active_streaming:
                await asyncio.sleep(0.12)
            else:
                await asyncio.sleep(2.5)

    def _sync_capture_and_infer(self) -> Optional[Tuple[bytes, int, float, float]]:
        """
        Synchronous worker running in Python ThreadPoolExecutor via asyncio.to_thread.
        Reads real frame, executes YOLOv8 detection, draws telemetry HUD, encodes JPEG.
        Guarantees the asyncio event loop remains 100% responsive for all HTTP APIs.
        """
        if not self.cap or not self.cap.isOpened():
            return None

        start_t = time.time()
        ret, frame = self.cap.read()

        if not ret:
            # Loop video file smoothly
            if self.source_type in ("file", "real_footage") and self.cap:
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self.cap.read()

            if not ret:
                return None

        # Resize for high-throughput real-time AI processing
        h, w = frame.shape[:2]
        if w > 640:
            scale = 640.0 / w
            frame = cv2.resize(frame, (640, int(h * scale)))

        # Run REAL YOLOv8 person detection on the actual camera frame
        yolo = get_shared_yolo()
        annotated_frame, count, detections = yolo.detect(frame)

        # Average detection confidence
        conf = 0.88
        if detections:
            conf = round(sum(d.get("confidence", 0.85) for d in detections) / len(detections), 2)

        elapsed = time.time() - start_t
        fps = round(1.0 / max(0.01, elapsed), 1)

        # Draw real-time HUD OSD overlay
        self._overlay_osd(annotated_frame, count, fps, conf)

        # Encode JPEG frame for real-time video stream
        _, buf = cv2.imencode(".jpg", annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
        return buf.tobytes(), count, conf, fps

    async def _process_real_frame(self):
        """Read and infer from active real camera capture using YOLOv8 via thread pool."""
        sem = get_yolo_semaphore()
        async with sem:
            result = await asyncio.to_thread(self._sync_capture_and_infer)

        if result is None:
            if not self.cap or not self.cap.isOpened():
                self.connection_status = "reconnecting"
            return

        frame_bytes, count, conf, fps = result
        self.last_frame_bytes = frame_bytes
        self.fps = fps
        self._update_metrics(count, conf)

    def _generate_offline_frame(self):
        """Generate a realistic CCTV offline / standby placeholder frame."""
        frame = np.zeros((360, 640, 3), dtype=np.uint8)
        frame[:] = (15, 18, 25)
        for y in range(0, 360, 40):
            cv2.line(frame, (0, y), (640, y), (25, 30, 42), 1)
        for x in range(0, 640, 40):
            cv2.line(frame, (x, 0), (x, 360), (25, 30, 42), 1)

        cv2.putText(frame, f"[CAMERA POINT: {self.name.upper()}]", (160, 160),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 210, 230), 1, cv2.LINE_AA)
        status_msg = "FEED OFFLINE / STANDBY" if self.connection_status == "offline" else "RECONNECTING TO CAMERA INPUT..."
        cv2.putText(frame, status_msg, (170, 195),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 120, 240) if self.connection_status == "offline" else (0, 200, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, "Attach Webcam or Upload Video to activate real-time feed", (110, 230),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, (130, 145, 170), 1, cv2.LINE_AA)

        self._overlay_osd(frame, 0, 0.0, 0.0)
        _, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        self.last_frame_bytes = buf.tobytes()

    def _overlay_osd(self, frame: np.ndarray, count: int, fps: float, conf: float):
        """Draw surveillance HUD/OSD telemetry banner onto frame."""
        h, w = frame.shape[:2]
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        # Top banner background
        cv2.rectangle(frame, (0, 0), (w, 36), (11, 15, 25), -1)
        cv2.line(frame, (0, 36), (w, 36), (40, 50, 70), 1)

        # Source label text
        source_label = "WEBCAM [DEV 0]" if self.source_type == "webcam" else (
            "RTSP STREAM" if self.source_type in ("rtsp", "stream") else (
                f"FILE: {os.path.basename(self.source_path or '')}" if self.source_type == "file" else "CCTV REAL FOOTAGE"
            )
        )

        # Camera Name & Status dot
        status_color = (0, 230, 118) if self.crowd_status == "Normal" else (
            (0, 180, 255) if self.crowd_status == "Warning" else (50, 50, 245)
        )
        cv2.circle(frame, (16, 18), 5, status_color, -1)
        cv2.putText(frame, f"{self.name.upper()} | {source_label}", (28, 22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (240, 245, 255), 1, cv2.LINE_AA)

        # Live Timecode
        cv2.putText(frame, now_str, (max(200, w - 210), 22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (160, 175, 195), 1, cv2.LINE_AA)

        # Bottom HUD bar
        cv2.rectangle(frame, (0, h - 34), (w, h), (11, 15, 25), -1)
        cv2.line(frame, (0, h - 34), (w, h - 34), (40, 50, 70), 1)

        hud_text = f"YOLOv8 DETECTED: {count} PERSONS | CAP: {self.capacity} | OCC: {self.occupancy}% | STATUS: {self.crowd_status} | FPS: {fps} | CONF: {int(conf*100)}%"
        cv2.putText(frame, hud_text, (10, h - 13),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, status_color, 1, cv2.LINE_AA)

    def _update_metrics(self, count: int, conf: float = 0.88):
        """Update occupancy, crowd status, alerts, and trend line."""
        self.people_count = count
        self.detection_confidence = conf
        self.last_processed_time = datetime.utcnow().isoformat()

        cap = max(1, self.capacity)
        self.occupancy = round((count / cap) * 100, 1)

        # Classify status
        if self.occupancy >= self.critical_threshold or self.occupancy >= 100.0:
            self.crowd_status = "Critical"
        elif self.occupancy >= self.warning_threshold:
            self.crowd_status = "Warning"
        else:
            self.crowd_status = "Normal"

        # Update real-time history point (every 2-3 seconds)
        t_str = datetime.utcnow().strftime("%H:%M:%S")
        if not self.trend_history or self.trend_history[-1]["time"] != t_str:
            self.trend_history.append({
                "time": t_str,
                "people": self.people_count,
                "occupancy": self.occupancy,
                "status": self.crowd_status
            })
            if len(self.trend_history) > 30:
                self.trend_history.pop(0)

        # Evaluate Camera-Specific Alert
        self.active_alerts = []
        if self.crowd_status == "Critical":
            self.active_alerts.append({
                "id": f"alt-{self.camera_id}-crit",
                "camera_id": self.camera_id,
                "title": f"Overcapacity Critical Alert ({self.name})",
                "message": f"Detected {self.people_count}/{self.capacity} persons ({self.occupancy}% occupancy) in {self.monitoring_zone}!",
                "alert_type": "CAPACITY_EXCEEDED",
                "severity": "critical",
                "timestamp": self.last_processed_time,
                "resolved": False
            })
        elif self.crowd_status == "Warning":
            self.active_alerts.append({
                "id": f"alt-{self.camera_id}-warn",
                "camera_id": self.camera_id,
                "title": f"High Density Warning ({self.name})",
                "message": f"Approaching limit: {self.people_count}/{self.capacity} persons ({self.occupancy}% occupancy) in {self.monitoring_zone}.",
                "alert_type": "HIGH_OCCUPANCY",
                "severity": "warning",
                "timestamp": self.last_processed_time,
                "resolved": False
            })

    def set_capacity(self, new_capacity: int, warning_threshold: Optional[float] = None, critical_threshold: Optional[float] = None):
        if new_capacity > 0:
            self.capacity = new_capacity
        if warning_threshold is not None:
            self.warning_threshold = warning_threshold
        if critical_threshold is not None:
            self.critical_threshold = critical_threshold
        self._update_metrics(self.people_count, self.detection_confidence)

    def attach_webcam(self, device_index: int = 0) -> bool:
        """Attach physical webcam device."""
        self.stop_stream()
        self.source_type = "webcam"
        self.source_path = str(device_index)
        try:
            self.cap = cv2.VideoCapture(device_index, cv2.CAP_DSHOW)
        except Exception:
            self.cap = cv2.VideoCapture(device_index)

        if not self.cap or not self.cap.isOpened():
            logger.error(f"Failed to open webcam {device_index} for camera {self.camera_id}")
            self.connection_status = "offline"
            return False
        self.connection_status = "live"
        self.mark_active_streaming()
        self.start_pipeline()
        return True

    def attach_video_file(self, file_path: str) -> bool:
        """Attach video file (.mp4, .avi, etc.)."""
        self.stop_stream()
        self.source_type = "file"
        self.source_path = file_path
        self.cap = cv2.VideoCapture(file_path)
        if not self.cap.isOpened():
            logger.error(f"Failed to open video file {file_path} for camera {self.camera_id}")
            self.connection_status = "offline"
            return False
        self.connection_status = "live"
        self.mark_active_streaming()
        self.start_pipeline()
        return True

    def attach_rtsp_stream(self, stream_url: str) -> bool:
        """Attach RTSP or HTTP video stream URL."""
        self.stop_stream()
        self.source_type = "rtsp"
        self.source_path = stream_url
        self.cap = cv2.VideoCapture(stream_url)
        if not self.cap.isOpened():
            logger.error(f"Failed to open RTSP stream {stream_url} for camera {self.camera_id}")
            self.connection_status = "offline"
            return False
        self.connection_status = "live"
        self.mark_active_streaming()
        self.start_pipeline()
        return True

    def set_status(self, status: str):
        """Set connection status ('live', 'offline', 'reconnecting')."""
        self.connection_status = status
        if status == "offline":
            self.fps = 0.0

    def stop_stream(self):
        """Release current video capture."""
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self.connection_status = "offline"

    def reconnect(self):
        """Attempt to reconnect to configured source."""
        self.connection_status = "reconnecting"
        self._open_capture()

    def get_dashboard_data(self) -> Dict[str, Any]:
        """Return complete snapshot required for the camera dashboard."""
        return {
            "id": self.camera_id,
            "name": self.name,
            "region_id": self.region_id,
            "region_name": self.region_name,
            "monitoring_zone": self.monitoring_zone,
            "connection_status": self.connection_status,
            "has_feed": self.connection_status == "live",
            "video_feed_url": f"/api/cameras/{self.camera_id}/feed",
            "people_count": self.people_count,
            "capacity": self.capacity,
            "warning_threshold": self.warning_threshold,
            "critical_threshold": self.critical_threshold,
            "occupancy": self.occupancy,
            "crowd_status": self.crowd_status,
            "last_processed_time": self.last_processed_time,
            "detection_confidence": self.detection_confidence,
            "fps": self.fps,
            "active_alerts": self.active_alerts,
            "trend_history": list(self.trend_history),
            "source_type": self.source_type,
            "source_path": self.source_path
        }
