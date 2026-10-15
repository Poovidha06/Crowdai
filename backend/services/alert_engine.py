import uuid
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.database.models import Alert, CrowdMeasurement, Zone, Region

logger = logging.getLogger("alert_engine")

class AlertEngine:
    GROWTH_THRESHOLD_PERCENT = 25.0  # 25% surge triggers rapid accumulation alert
    TIME_WINDOW_MINUTES = 5
    HYSTERESIS_BUFFER_PERCENT = 5.0  # 5% deadband to prevent alert flapping
    SUSTAINED_DURATION_SECONDS = 30  # 30 seconds of high occupancy triggers sustained alert

    def __init__(self):
        # State tracker to prevent duplicate active alerts and track condition persistence
        # Format: key -> {"active": bool, "alert_id": str, "first_detected": float, "last_evaluated": float}
        self._active_conditions: Dict[str, Dict[str, Any]] = {}
        # Track occupancy start time for sustained occupancy evaluation
        self._occupancy_timer: Dict[str, float] = {}

    def evaluate_camera(
        self,
        db: Session,
        camera_id: str,
        camera_name: str,
        region_id: str,
        region_name: str,
        current_people: int,
        capacity: int,
        occupancy: float,
        warning_threshold: float = 75.0,
        critical_threshold: float = 90.0,
        connection_status: str = "live",
        last_processed_time: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Evaluate all alert rules for an individual camera point with hysteresis,
        persistence duration, anti-flapping, and offline/stale detection.
        """
        now = datetime.utcnow()
        now_ts = time.time()
        generated_alerts: List[Dict[str, Any]] = []

        # ----------------------------------------------------
        # 1. Connection Failure / Offline / Stale Detection
        # ----------------------------------------------------
        offline_key = f"cam:{camera_id}:CAMERA_OFFLINE"
        stale_key = f"cam:{camera_id}:STALE_DETECTION"

        if connection_status == "offline":
            if not self._is_condition_active(offline_key):
                alert_dict = self._create_alert_dict(
                    camera_id=camera_id,
                    camera_name=camera_name,
                    region_id=region_id,
                    region_name=region_name,
                    alert_type="CAMERA_OFFLINE",
                    severity="critical",
                    title=f"Feed Disconnected: {camera_name}",
                    message=f"Video stream disconnected or offline. Last recorded count: {current_people}.",
                    people_count=current_people,
                    capacity=capacity,
                    occupancy=occupancy,
                    threshold_value=0.0
                )
                self._persist_alert(db, alert_dict)
                self._set_condition_active(offline_key, alert_dict["id"], now_ts)
                generated_alerts.append(alert_dict)
        else:
            # Condition cleared -> re-arm
            if self._is_condition_active(offline_key):
                self._clear_condition(offline_key)

        # Check stale frames (>30 seconds)
        if last_processed_time and connection_status != "offline":
            try:
                dt_last = datetime.fromisoformat(last_processed_time.replace("Z", ""))
                if (now - dt_last).total_seconds() > 30:
                    if not self._is_condition_active(stale_key):
                        alert_dict = self._create_alert_dict(
                            camera_id=camera_id,
                            camera_name=camera_name,
                            region_id=region_id,
                            region_name=region_name,
                            alert_type="STALE_DETECTION",
                            severity="warning",
                            title=f"Stale Detections: {camera_name}",
                            message=f"No new processed frames received for >30 seconds. Video feed may be frozen.",
                            people_count=current_people,
                            capacity=capacity,
                            occupancy=occupancy,
                            threshold_value=30.0
                        )
                        self._persist_alert(db, alert_dict)
                        self._set_condition_active(stale_key, alert_dict["id"], now_ts)
                        generated_alerts.append(alert_dict)
                else:
                    if self._is_condition_active(stale_key):
                        self._clear_condition(stale_key)
            except Exception:
                pass

        # If camera is completely offline, skip occupancy checks
        if connection_status == "offline":
            return generated_alerts

        # ----------------------------------------------------
        # 2. Capacity Exceeded (Critical) with Hysteresis
        # ----------------------------------------------------
        crit_key = f"cam:{camera_id}:CAPACITY_EXCEEDED"
        crit_deactivate = max(50.0, critical_threshold - self.HYSTERESIS_BUFFER_PERCENT)

        if occupancy >= critical_threshold or current_people > capacity:
            if not self._is_condition_active(crit_key):
                alert_dict = self._create_alert_dict(
                    camera_id=camera_id,
                    camera_name=camera_name,
                    region_id=region_id,
                    region_name=region_name,
                    alert_type="CAPACITY_EXCEEDED",
                    severity="critical",
                    title=f"Critical Overcapacity: {camera_name}",
                    message=f"Capacity breached! {current_people}/{capacity} people detected ({occupancy}% occupancy).",
                    people_count=current_people,
                    capacity=capacity,
                    occupancy=occupancy,
                    threshold_value=critical_threshold
                )
                self._persist_alert(db, alert_dict)
                self._set_condition_active(crit_key, alert_dict["id"], now_ts)
                generated_alerts.append(alert_dict)
        elif occupancy < crit_deactivate:
            # Below hysteresis reset boundary -> condition cleared and re-armed
            if self._is_condition_active(crit_key):
                self._clear_condition(crit_key)

        # ----------------------------------------------------
        # 3. High Occupancy Warning with Hysteresis
        # ----------------------------------------------------
        warn_key = f"cam:{camera_id}:HIGH_OCCUPANCY"
        warn_deactivate = max(40.0, warning_threshold - self.HYSTERESIS_BUFFER_PERCENT)

        if occupancy >= warning_threshold and occupancy < critical_threshold:
            if not self._is_condition_active(warn_key):
                alert_dict = self._create_alert_dict(
                    camera_id=camera_id,
                    camera_name=camera_name,
                    region_id=region_id,
                    region_name=region_name,
                    alert_type="HIGH_OCCUPANCY",
                    severity="warning",
                    title=f"Crowd Density Warning: {camera_name}",
                    message=f"Approaching capacity: {current_people}/{capacity} people detected ({occupancy}% occupancy).",
                    people_count=current_people,
                    capacity=capacity,
                    occupancy=occupancy,
                    threshold_value=warning_threshold
                )
                self._persist_alert(db, alert_dict)
                self._set_condition_active(warn_key, alert_dict["id"], now_ts)
                generated_alerts.append(alert_dict)
        elif occupancy < warn_deactivate:
            if self._is_condition_active(warn_key):
                self._clear_condition(warn_key)

        # ----------------------------------------------------
        # 4. Sustained High Occupancy Duration
        # ----------------------------------------------------
        sustained_key = f"cam:{camera_id}:SUSTAINED_HIGH_OCCUPANCY"
        if occupancy >= warning_threshold:
            if camera_id not in self._occupancy_timer:
                self._occupancy_timer[camera_id] = now_ts
            else:
                elapsed_duration = now_ts - self._occupancy_timer[camera_id]
                if elapsed_duration >= self.SUSTAINED_DURATION_SECONDS and not self._is_condition_active(sustained_key):
                    alert_dict = self._create_alert_dict(
                        camera_id=camera_id,
                        camera_name=camera_name,
                        region_id=region_id,
                        region_name=region_name,
                        alert_type="SUSTAINED_HIGH_OCCUPANCY",
                        severity="critical" if occupancy >= critical_threshold else "warning",
                        title=f"Sustained High Density: {camera_name}",
                        message=f"High occupancy ({occupancy}%) sustained continuously for >{int(elapsed_duration)}s.",
                        people_count=current_people,
                        capacity=capacity,
                        occupancy=occupancy,
                        threshold_value=float(self.SUSTAINED_DURATION_SECONDS)
                    )
                    self._persist_alert(db, alert_dict)
                    self._set_condition_active(sustained_key, alert_dict["id"], now_ts)
                    generated_alerts.append(alert_dict)
        else:
            self._occupancy_timer.pop(camera_id, None)
            if self._is_condition_active(sustained_key):
                self._clear_condition(sustained_key)

        # ----------------------------------------------------
        # 5. Rapid Growth / Sudden Accumulation
        # ----------------------------------------------------
        rapid_key = f"cam:{camera_id}:RAPID_GROWTH"
        rapid_growth = self._check_rapid_growth(db, camera_id, camera_name, region_id, region_name, current_people, capacity, occupancy)
        if rapid_growth:
            if not self._is_condition_active(rapid_key):
                self._persist_alert(db, rapid_growth)
                self._set_condition_active(rapid_key, rapid_growth["id"], now_ts)
                generated_alerts.append(rapid_growth)
        else:
            if self._is_condition_active(rapid_key):
                self._clear_condition(rapid_key)

        return generated_alerts

    def evaluate_region(
        self,
        db: Session,
        region_id: str,
        region_name: str,
        combined_people: int,
        maximum_capacity: int,
        occupancy: float
    ) -> Optional[Dict[str, Any]]:
        """Evaluate regional maximum capacity and severe campus crowd status."""
        reg_key = f"reg:{region_id}:REGIONAL_CAPACITY_EXCEEDED"
        now_ts = time.time()

        if combined_people > maximum_capacity and maximum_capacity > 0:
            if not self._is_condition_active(reg_key):
                alert_dict = self._create_alert_dict(
                    camera_id=None,
                    camera_name=None,
                    region_id=region_id,
                    region_name=region_name,
                    alert_type="REGIONAL_CAPACITY_EXCEEDED",
                    severity="critical",
                    title=f"Regional Overcapacity: {region_name}",
                    message=f"Combined regional count {combined_people} exceeds maximum configured safety capacity of {maximum_capacity} ({occupancy}% occupancy).",
                    people_count=combined_people,
                    capacity=maximum_capacity,
                    occupancy=occupancy,
                    threshold_value=100.0
                )
                self._persist_alert(db, alert_dict)
                self._set_condition_active(reg_key, alert_dict["id"], now_ts)
                return alert_dict
        else:
            if self._is_condition_active(reg_key):
                self._clear_condition(reg_key)
        return None

    # Legacy support for evaluate_zone
    def evaluate_zone(self, db: Session, zone: Zone, current_people: int) -> Optional[Dict[str, Any]]:
        capacity = zone.capacity if zone.capacity > 0 else 50
        occupancy = round((current_people / capacity) * 100, 2)
        alerts = self.evaluate_camera(
            db=db,
            camera_id=zone.id,
            camera_name=zone.name,
            region_id=zone.region_id or "reg-entire-campus",
            region_name="Campus Area",
            current_people=current_people,
            capacity=capacity,
            occupancy=occupancy,
            warning_threshold=zone.warning_threshold or 75.0,
            critical_threshold=zone.critical_threshold or 90.0
        )
        return alerts[0] if alerts else None

    def _create_alert_dict(
        self,
        camera_id: Optional[str],
        camera_name: Optional[str],
        region_id: Optional[str],
        region_name: Optional[str],
        alert_type: str,
        severity: str,
        title: str,
        message: str,
        people_count: int,
        capacity: int,
        occupancy: float,
        threshold_value: float
    ) -> Dict[str, Any]:
        return {
            "id": f"alt-{uuid.uuid4().hex[:8]}",
            "camera_id": camera_id,
            "camera_name": camera_name,
            "zone_id": camera_id,
            "zone_name": camera_name,
            "region_id": region_id,
            "region_name": region_name,
            "alert_type": alert_type,
            "severity": severity,
            "title": title,
            "message": message,
            "people_count": people_count,
            "capacity": capacity,
            "occupancy": occupancy,
            "threshold_value": threshold_value,
            "timestamp": datetime.utcnow().isoformat(),
            "acknowledged": False,
            "acknowledged_at": None,
            "acknowledged_by": None,
            "resolved": False,
            "cleared": False
        }

    def _persist_alert(self, db: Session, alert_dict: Dict[str, Any]):
        try:
            # Check duplicate within last 60 seconds
            cutoff = datetime.utcnow() - timedelta(seconds=60)
            existing = db.query(Alert).filter(
                Alert.type == alert_dict["alert_type"],
                Alert.camera_id == alert_dict["camera_id"],
                Alert.resolved == False,
                Alert.timestamp >= cutoff
            ).first()

            if not existing:
                db_alert = Alert(
                    id=alert_dict["id"],
                    zone_id=alert_dict["camera_id"],
                    camera_id=alert_dict["camera_id"],
                    camera_name=alert_dict["camera_name"],
                    region_id=alert_dict["region_id"],
                    region_name=alert_dict["region_name"],
                    type=alert_dict["alert_type"],
                    severity=alert_dict["severity"],
                    message=alert_dict["message"],
                    people_count=alert_dict["people_count"],
                    capacity=alert_dict["capacity"],
                    occupancy=alert_dict["occupancy"],
                    threshold_value=alert_dict["threshold_value"],
                    resolved=False,
                    acknowledged=False,
                    cleared=False
                )
                db.add(db_alert)
                db.commit()
        except Exception as e:
            logger.error(f"Error persisting alert to DB: {e}")
            db.rollback()

    def _check_rapid_growth(
        self,
        db: Session,
        camera_id: str,
        camera_name: str,
        region_id: str,
        region_name: str,
        current_people: int,
        capacity: int,
        occupancy: float
    ) -> Optional[Dict[str, Any]]:
        window_start = datetime.utcnow() - timedelta(minutes=self.TIME_WINDOW_MINUTES)
        past_measurement = db.query(CrowdMeasurement).filter(
            CrowdMeasurement.zone_id == camera_id,
            CrowdMeasurement.timestamp >= window_start
        ).order_by(CrowdMeasurement.timestamp.asc()).first()

        if past_measurement and past_measurement.people_count > 0:
            past_count = past_measurement.people_count
            increase = current_people - past_count
            increase_percent = (increase / past_count) * 100

            if increase_percent >= self.GROWTH_THRESHOLD_PERCENT and increase >= 5:
                return self._create_alert_dict(
                    camera_id=camera_id,
                    camera_name=camera_name,
                    region_id=region_id,
                    region_name=region_name,
                    alert_type="RAPID_GROWTH",
                    severity="warning",
                    title=f"Rapid Crowd Influx: {camera_name}",
                    message=f"Rapid crowd accumulation! Surge of +{increase} people ({int(increase_percent)}% growth) over last {self.TIME_WINDOW_MINUTES} mins.",
                    people_count=current_people,
                    capacity=capacity,
                    occupancy=occupancy,
                    threshold_value=self.GROWTH_THRESHOLD_PERCENT
                )
        return None

    def _is_condition_active(self, key: str) -> bool:
        cond = self._active_conditions.get(key)
        return cond is not None and cond.get("active", False)

    def _set_condition_active(self, key: str, alert_id: str, now_ts: float):
        self._active_conditions[key] = {
            "active": True,
            "alert_id": alert_id,
            "first_detected": now_ts,
            "last_evaluated": now_ts
        }

    def _clear_condition(self, key: str):
        if key in self._active_conditions:
            self._active_conditions.pop(key, None)

    # Actions: Acknowledge, Resolve, Clear
    def acknowledge_alert(self, db: Session, alert_id: str, user_name: str = "Operator") -> Optional[Dict[str, Any]]:
        a = db.query(Alert).filter(Alert.id == alert_id).first()
        if not a:
            return None
        a.acknowledged = True
        a.acknowledged_at = datetime.utcnow()
        a.acknowledged_by = user_name
        db.commit()
        db.refresh(a)
        return self._alert_to_dict(a)

    def resolve_alert(self, db: Session, alert_id: str) -> Optional[Dict[str, Any]]:
        a = db.query(Alert).filter(Alert.id == alert_id).first()
        if not a:
            return None
        a.resolved = True
        db.commit()
        db.refresh(a)
        return self._alert_to_dict(a)

    def clear_alert(self, db: Session, alert_id: str) -> bool:
        a = db.query(Alert).filter(Alert.id == alert_id).first()
        if not a:
            return False
        a.cleared = True
        db.commit()
        return True

    def clear_all_resolved(self, db: Session) -> int:
        count = db.query(Alert).filter(Alert.resolved == True).update({"cleared": True})
        db.commit()
        return count

    def get_filtered_alerts(
        self,
        db: Session,
        region_id: Optional[str] = None,
        camera_id: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None, # "all", "active", "acknowledged", "resolved"
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        query = db.query(Alert).filter(Alert.cleared == False)

        if region_id and region_id != "all" and region_id != "reg-entire-campus":
            query = query.filter(Alert.region_id == region_id)
        if camera_id and camera_id != "all":
            query = query.filter(Alert.camera_id == camera_id)
        if severity and severity != "all":
            query = query.filter(Alert.severity == severity.lower())

        if status == "active":
            query = query.filter(Alert.resolved == False, Alert.acknowledged == False)
        elif status == "acknowledged":
            query = query.filter(Alert.acknowledged == True, Alert.resolved == False)
        elif status == "resolved":
            query = query.filter(Alert.resolved == True)

        alerts = query.order_by(Alert.timestamp.desc()).limit(limit).all()
        return [self._alert_to_dict(a) for a in alerts]

    def _alert_to_dict(self, a: Alert) -> Dict[str, Any]:
        return {
            "id": a.id,
            "zone_id": a.zone_id or a.camera_id,
            "zone_name": a.camera_name or (a.zone.name if a.zone else "Monitored Zone"),
            "camera_id": a.camera_id or a.zone_id,
            "camera_name": a.camera_name or (a.zone.name if a.zone else "Camera Point"),
            "region_id": a.region_id or "reg-entire-campus",
            "region_name": a.region_name or "Campus Area",
            "title": f"{a.type.replace('_', ' ').title()}: {a.camera_name or 'Zone'}",
            "message": a.message,
            "alert_type": a.type,
            "severity": a.severity,
            "people_count": int(a.people_count or 0),
            "capacity": int(a.capacity or 0),
            "occupancy": float(a.occupancy or 0.0),
            "threshold_value": float(a.threshold_value or 0.0),
            "timestamp": a.timestamp.isoformat() if a.timestamp else datetime.utcnow().isoformat(),
            "acknowledged": bool(a.acknowledged),
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
            "acknowledged_by": a.acknowledged_by,
            "resolved": bool(a.resolved),
            "cleared": bool(a.cleared)
        }

alert_engine = AlertEngine()
