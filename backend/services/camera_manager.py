import os
import cv2
import asyncio
import logging
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session

from backend.database.database import SessionLocal
from backend.database.models import Zone, Region, Camera
from backend.services.camera_pipeline import CameraPipeline, DEFAULT_SAMPLE_VIDEO

logger = logging.getLogger("camera_manager")


class CameraManager:
    """
    Central manager for independent camera pipelines.
    Guarantees every registered camera point runs its own AI pipeline with
    real-world video input, independent counts, FPS, detection confidence,
    thresholds, status, and video feed.
    """
    def __init__(self):
        self.pipelines: Dict[str, CameraPipeline] = {}
        self._initialized = False

    def initialize_from_db(self):
        """Load all registered camera points from SQLite database and launch real pipelines."""
        if self._initialized:
            return

        db = SessionLocal()
        try:
            zones = db.query(Zone).all()
            regions_map = {r.id: r.name for r in db.query(Region).all()}

            zone_subtitles = {
                "cam-main-entry": "Main Gate Turnstile & Perimeter Barrier",
                "cam-main-barrier": "Vehicle Checkpoint & ID Inspection Zone",
                "cam-acad-quad": "Academic Block Central Open Quadrangle",
                "cam-acad-corridor": "East Classroom Corridors & Stairwell",
                "cam-lib-reading": "Central Reading Hall & Reference Area",
                "cam-lib-entry": "Library Entry Turnstiles & Bag Counter",
                "cam-cant-court": "Main Dining Hall & Seating Area",
                "cam-cant-counter": "Food Service Counters & Payment Queue",
                "cam-audi-hall": "Auditorium Main Seating & Stage Perimeter",
                "cam-audi-foyer": "Auditorium Entrance Foyer & Waiting Hall",
                "cam-park-two": "Two-Wheeler Parking Lot & Transit Lane",
                "cam-park-four": "Four-Wheeler North Bay & Security Post"
            }

            for z in zones:
                reg_name = regions_map.get(z.region_id, "Campus Perimeter")
                mon_zone = zone_subtitles.get(z.id, f"{z.name} Monitored Zone")
                status = "live" if z.status in ("active", "online", "live") else ("offline" if z.status == "offline" else "live")

                stype = z.source_type or "real_footage"
                spath = z.source_path

                pipeline = CameraPipeline(
                    camera_id=z.id,
                    name=z.name,
                    region_id=z.region_id or "reg-entire-campus",
                    region_name=reg_name,
                    monitoring_zone=mon_zone,
                    capacity=z.capacity,
                    warning_threshold=z.warning_threshold or 75.0,
                    critical_threshold=z.critical_threshold or 90.0,
                    initial_status=status,
                    source_type=stype,
                    source_path=spath
                )
                pipeline.start_pipeline()
                self.pipelines[z.id] = pipeline

            self._initialized = True
            logger.info(f"Initialized {len(self.pipelines)} independent camera pipelines with real video feeds.")
        except Exception as e:
            logger.error(f"Error initializing camera manager: {e}")
        finally:
            db.close()

    def ensure_camera(self, z: Zone) -> CameraPipeline:
        """Ensure pipeline exists for a zone/camera."""
        if z.id not in self.pipelines:
            db = SessionLocal()
            reg_name = "Campus Perimeter"
            try:
                reg = db.query(Region).filter(Region.id == z.region_id).first()
                if reg:
                    reg_name = reg.name
            finally:
                db.close()

            # Ensure new cameras start instantly without hardware device collision
            src_type = z.source_type or "real_footage"
            src_path = z.source_path
            if src_type == "webcam":
                already_in_use = any(
                    p.source_type == "webcam" and str(p.source_path or "0") == str(src_path or "0")
                    for p in self.pipelines.values()
                )
                if already_in_use:
                    src_type = "real_footage"
                    src_path = None

            pipeline = CameraPipeline(
                camera_id=z.id,
                name=z.name,
                region_id=z.region_id or "reg-entire-campus",
                region_name=reg_name,
                monitoring_zone=f"{z.name} Monitored Area",
                capacity=z.capacity,
                warning_threshold=z.warning_threshold or 75.0,
                critical_threshold=z.critical_threshold or 90.0,
                initial_status="live",
                source_type=src_type,
                source_path=src_path
            )
            pipeline.start_pipeline()
            self.pipelines[z.id] = pipeline
        return self.pipelines[z.id]

    def remove_camera(self, camera_id: str):
        """Stop and remove pipeline for a deleted camera point."""
        if camera_id in self.pipelines:
            pipe = self.pipelines.pop(camera_id)
            pipe._is_running = False
            pipe.stop_stream()
            logger.info(f"Removed camera pipeline {camera_id}.")

    def ensure_tasks_running(self):
        """Ensure all pipelines have active async background loops if an event loop is running."""
        try:
            loop = asyncio.get_running_loop()
            for pipe in self.pipelines.values():
                if pipe._task is None or pipe._task.done():
                    pipe._task = loop.create_task(pipe._run_loop())
        except RuntimeError:
            pass

    def get_all_camera_dashboards(self) -> List[Dict[str, Any]]:
        """Return list of camera dashboards for all registered camera points."""
        self.initialize_from_db()
        self.ensure_tasks_running()
        return [pipeline.get_dashboard_data() for pipeline in self.pipelines.values()]

    def get_camera(self, camera_id: str) -> Optional[CameraPipeline]:
        self.initialize_from_db()
        self.ensure_tasks_running()
        return self.pipelines.get(camera_id)

    def get_camera_dashboard(self, camera_id: str) -> Optional[Dict[str, Any]]:
        pipe = self.get_camera(camera_id)
        if pipe:
            return pipe.get_dashboard_data()
        return None

    def start_camera_webcam(self, camera_id: str, device_index: int = 0) -> bool:
        pipe = self.get_camera(camera_id)
        if not pipe:
            return False
        success = pipe.attach_webcam(device_index)
        if success:
            self._persist_source(camera_id, "webcam", str(device_index))
        return success

    def start_camera_file(self, camera_id: str, file_path: str) -> bool:
        pipe = self.get_camera(camera_id)
        if not pipe:
            return False
        success = pipe.attach_video_file(file_path)
        if success:
            self._persist_source(camera_id, "file", file_path)
        return success

    def start_camera_rtsp(self, camera_id: str, stream_url: str) -> bool:
        pipe = self.get_camera(camera_id)
        if not pipe:
            return False
        success = pipe.attach_rtsp_stream(stream_url)
        if success:
            self._persist_source(camera_id, "rtsp", stream_url)
        return success

    def stop_camera(self, camera_id: str) -> bool:
        pipe = self.get_camera(camera_id)
        if not pipe:
            return False
        pipe.stop_stream()
        pipe.set_status("offline")
        return True

    def reconnect_camera(self, camera_id: str) -> bool:
        pipe = self.get_camera(camera_id)
        if not pipe:
            return False
        pipe.reconnect()
        return True

    def update_camera_capacity(
        self,
        camera_id: str,
        capacity: int,
        warning_threshold: Optional[float] = None,
        critical_threshold: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        pipe = self.get_camera(camera_id)
        if not pipe:
            return None
        pipe.set_capacity(capacity, warning_threshold, critical_threshold)
        return pipe.get_dashboard_data()

    def get_frame_bytes(self, camera_id: str) -> Optional[bytes]:
        pipe = self.get_camera(camera_id)
        if pipe:
            pipe.mark_active_streaming()
            return pipe.last_frame_bytes
        return None

    def _persist_source(self, camera_id: str, source_type: str, source_path: str):
        """Persist updated source configuration into SQLite."""
        db = SessionLocal()
        try:
            z = db.query(Zone).filter(Zone.id == camera_id).first()
            if z:
                z.source_type = source_type
                z.source_path = source_path
                db.commit()
        except Exception as e:
            logger.error(f"Error persisting camera source for {camera_id}: {e}")
        finally:
            db.close()

    def scan_available_sources(self) -> Dict[str, Any]:
        """Scan system for available physical webcams and video files."""
        available_cams = []
        # Check standard webcam indices 0..2
        for idx in range(3):
            test_cap = cv2.VideoCapture(idx)
            if test_cap.isOpened():
                available_cams.append({
                    "device_index": idx,
                    "label": f"Physical Webcam (Device #{idx})"
                })
                test_cap.release()

        # Check uploaded / sample video files
        uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
        video_files = []
        if os.path.exists(uploads_dir):
            for fname in os.listdir(uploads_dir):
                if fname.lower().endswith((".mp4", ".avi", ".mov", ".mkv")):
                    full_p = os.path.join(uploads_dir, fname)
                    video_files.append({
                        "filename": fname,
                        "path": full_p,
                        "size_bytes": os.path.getsize(full_p)
                    })

        return {
            "webcams": available_cams,
            "sample_footage": os.path.exists(DEFAULT_SAMPLE_VIDEO),
            "video_files": video_files
        }


# Global singleton CameraManager instance
camera_manager = CameraManager()
