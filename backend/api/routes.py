import os
import shutil
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database.database import get_db, init_db
from backend.database.models import Location, Region, Zone, Camera, CrowdMeasurement, Alert
import math
from backend.models.schemas import (
    CapacityUpdateSchema, LocationSchema, LocationCreateSchema,
    ZoneSchema, ZoneCreateSchema, ZoneUpdateSchema, CameraSchema,
    AlertSchema, HistoricalAnalyticsSchema, LocationSummarySchema,
    RegionSchema, RegionCreateSchema, RegionUpdateSchema,
    CameraDashboardSchema, CameraCapacityUpdateSchema, CameraStreamUrlSchema,
    CombinedRegionAnalyticsSchema, CameraHistorySchema,
    RegionCombinedHistorySchema
)
from backend.services.video_processor import video_processor
from backend.services.camera_manager import camera_manager
from backend.services.analytics_service import analytics_service
from backend.services.heatmap_service import heatmap_service
from backend.services.alert_engine import alert_engine
from backend.utils.config import config

router = APIRouter()
init_db()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ----------------------------
# Phase 1 Legacy Endpoints (Preserved)
# ----------------------------
@router.get("/health")
async def health_check():
    return {
        "status": "online",
        "project": config.PROJECT_NAME,
        "title": config.PROJECT_TITLE,
        "version": config.VERSION,
        "phase": 2
    }

@router.get("/analytics")
async def get_current_analytics():
    return video_processor.latest_analytics

@router.post("/capacity")
async def update_capacity(payload: CapacityUpdateSchema, db: Session = Depends(get_db)):
    success = video_processor.set_capacity(payload.capacity)
    if not success:
        raise HTTPException(status_code=400, detail="Capacity must be greater than zero.")
    
    first_zone = db.query(Zone).first()
    if first_zone:
        first_zone.capacity = payload.capacity
        db.commit()

    return {
        "message": "Capacity updated successfully",
        "capacity": payload.capacity,
        "analytics": video_processor.latest_analytics
    }

@router.post("/webcam/start")
async def start_webcam():
    success = video_processor.start_webcam(0)
    if not success:
        raise HTTPException(status_code=500, detail="Unable to access webcam. Please check camera permissions.")
    return {"message": "Webcam started successfully", "source": "webcam"}

@router.post("/webcam/stop")
async def stop_webcam():
    video_processor.stop()
    return {"message": "Video processing stopped", "source": "stopped"}

@router.post("/upload_video")
async def upload_video(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")
    
    allowed_extensions = {".mp4", ".avi", ".mov", ".mkv"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Allowed: mp4, avi, mov, mkv")

    file_path = os.path.join(UPLOAD_DIR, f"input_video{ext}")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video file: {str(e)}")

    success = video_processor.start_video_file(file_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to process uploaded video file.")

    return {"message": "Video uploaded and processing started", "source": "file", "filename": file.filename}

@router.websocket("/ws/analytics")
async def websocket_analytics(websocket: WebSocket):
    await video_processor.connect_websocket(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        video_processor.disconnect_websocket(websocket)
    except Exception:
        video_processor.disconnect_websocket(websocket)

def generate_video_stream():
    import time
    while True:
        if video_processor.latest_frame_bytes:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + video_processor.latest_frame_bytes + b'\r\n')
            time.sleep(0.04)
        else:
            time.sleep(0.1)

@router.get("/video_feed")
async def video_feed():
    return StreamingResponse(
        generate_video_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

# ----------------------------
# Phase 2 Region & Camera Point APIs
# ----------------------------
def _build_zone_schema(z: Zone, is_primary_stream: bool, db: Session):
    pipe = camera_manager.ensure_camera(z)

    if is_primary_stream and video_processor.is_running:
        people = video_processor.latest_analytics.get("people_count", pipe.people_count)
        pipe.people_count = people
        cap = z.capacity if z.capacity > 0 else pipe.capacity
        pipe.capacity = cap
        pipe.occupancy = round((people / cap) * 100, 2) if cap > 0 else 0.0
    else:
        people = pipe.people_count
        cap = z.capacity if z.capacity > 0 else pipe.capacity
        pipe.capacity = cap

    occ = pipe.occupancy
    st = "LOW" if occ < 50 else ("MODERATE" if occ < 80 else ("HIGH" if occ <= 100 else "CRITICAL"))

    alert_dict = alert_engine.evaluate_zone(db, z, people)
    alert_schema = AlertSchema(**alert_dict) if alert_dict else None

    reg = db.query(Region).filter(Region.id == z.region_id).first() if z.region_id else None
    reg_name = reg.name if reg else "Campus Perimeter"

    return ZoneSchema(
        id=z.id,
        location_id=z.location_id,
        region_id=z.region_id,
        region_name=reg_name,
        monitoring_zone=pipe.monitoring_zone,
        name=z.name,
        capacity=cap,
        latitude=z.latitude,
        longitude=z.longitude,
        status=pipe.connection_status,
        people_count=people,
        occupancy=occ,
        status_level=st,
        crowd_status=pipe.crowd_status,
        connection_status=pipe.connection_status,
        last_processed_time=pipe.last_processed_time,
        fps=pipe.fps,
        detection_confidence=pipe.detection_confidence,
        has_feed=pipe.connection_status == "live",
        video_feed_url=f"/api/cameras/{z.id}/feed",
        active_alerts=pipe.active_alerts,
        trend_history=pipe.trend_history,
        alert=alert_schema
    ), alert_dict

@router.get("/regions", response_model=List[RegionSchema])
async def get_regions(db: Session = Depends(get_db)):
    regs = db.query(Region).order_by(Region.created_at.asc()).all()
    results = []

    for reg in regs:
        if reg.id == "reg-entire-campus":
            zones = db.query(Zone).all()
        else:
            zones = db.query(Zone).filter(Zone.region_id == reg.id).all()

        zone_schemas = []
        tot_people = 0
        tot_cap = 0
        active_cams = 0
        alert_cnt = 0

        for idx, z in enumerate(zones):
            is_prim = (reg.id == "reg-entire-campus" and idx == 0) or (idx == 0 and z.id == "cam-main-entry")
            z_schema, alert_dict = _build_zone_schema(z, is_prim, db)
            zone_schemas.append(z_schema)
            tot_people += z_schema.people_count
            tot_cap += z_schema.capacity
            if z.status == "active":
                active_cams += 1
            if alert_dict:
                alert_cnt += 1

        overall_occ = round((tot_people / tot_cap) * 100, 2) if tot_cap > 0 else 0.0

        results.append(RegionSchema(
            id=reg.id,
            location_id=reg.location_id,
            name=reg.name,
            description=reg.description,
            center_lat=reg.center_lat,
            center_lng=reg.center_lng,
            zoom_level=reg.zoom_level,
            boundary=reg.boundary,
            color=reg.color,
            is_custom=reg.is_custom,
            registered_cameras=len(zones),
            active_cameras=active_cams,
            total_people=tot_people,
            total_capacity=tot_cap,
            overall_occupancy=overall_occ,
            active_alerts_count=alert_cnt,
            zones=zone_schemas
        ))
    return results

@router.get("/regions/{region_id}", response_model=RegionSchema)
async def get_region(region_id: str, db: Session = Depends(get_db)):
    reg = db.query(Region).filter(Region.id == region_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Region not found")

    if reg.id == "reg-entire-campus":
        zones = db.query(Zone).all()
    else:
        zones = db.query(Zone).filter(Zone.region_id == reg.id).all()

    zone_schemas = []
    tot_people = 0
    tot_cap = 0
    active_cams = 0
    alert_cnt = 0

    for idx, z in enumerate(zones):
        is_prim = (idx == 0 and (reg.id == "reg-entire-campus" or z.id == "cam-main-entry"))
        z_schema, alert_dict = _build_zone_schema(z, is_prim, db)
        zone_schemas.append(z_schema)
        tot_people += z_schema.people_count
        tot_cap += z_schema.capacity
        if z.status == "active":
            active_cams += 1
        if alert_dict:
            alert_cnt += 1

    overall_occ = round((tot_people / tot_cap) * 100, 2) if tot_cap > 0 else 0.0

    return RegionSchema(
        id=reg.id,
        location_id=reg.location_id,
        name=reg.name,
        description=reg.description,
        center_lat=reg.center_lat,
        center_lng=reg.center_lng,
        zoom_level=reg.zoom_level,
        boundary=reg.boundary,
        color=reg.color,
        is_custom=reg.is_custom,
        registered_cameras=len(zones),
        active_cameras=active_cams,
        total_people=tot_people,
        total_capacity=tot_cap,
        overall_occupancy=overall_occ,
        active_alerts_count=alert_cnt,
        zones=zone_schemas
    )

@router.get("/regions/{region_id}/analytics", response_model=CombinedRegionAnalyticsSchema)
@router.get("/regions/{region_id}/combined-analytics", response_model=CombinedRegionAnalyticsSchema)
async def get_region_combined_analytics(
    region_id: str,
    overlap_percent: Optional[float] = Query(None, ge=0.0, le=50.0),
    db: Session = Depends(get_db)
):
    return analytics_service.get_combined_region_analytics(db, region_id, overlap_percent)

@router.put("/regions/{region_id}/overlap", response_model=CombinedRegionAnalyticsSchema)
async def update_region_overlap_deduction(
    region_id: str,
    payload: Optional[dict] = None,
    overlap_percent: Optional[float] = Query(None, ge=0.0, le=50.0),
    db: Session = Depends(get_db)
):
    percent = 15.0
    if payload and isinstance(payload, dict) and "overlap_percentage" in payload:
        percent = float(payload["overlap_percentage"])
    elif overlap_percent is not None:
        percent = float(overlap_percent)

    loc = db.query(Location).first()
    if loc:
        loc.overlap_deduction_percent = float(percent)
        db.commit()
    return analytics_service.get_combined_region_analytics(db, region_id, float(percent))


@router.post("/regions", response_model=RegionSchema)
async def create_region(payload: RegionCreateSchema, db: Session = Depends(get_db)):
    reg_id = payload.id or f"reg-custom-{uuid.uuid4().hex[:6]}"
    existing = db.query(Region).filter(Region.id == reg_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Region ID already exists.")

    new_reg = Region(
        id=reg_id,
        location_id=payload.location_id or "loc-tce-campus",
        name=payload.name,
        description=payload.description or f"Custom defined region: {payload.name}",
        center_lat=payload.center_lat,
        center_lng=payload.center_lng,
        zoom_level=payload.zoom_level or 18,
        boundary=payload.boundary,
        color=payload.color or "#10b981",
        is_custom=True
    )
    db.add(new_reg)
    db.flush()

    # Add camera points if specified or auto-create according to camera_count
    created_zones = []
    if payload.camera_points and len(payload.camera_points) > 0:
        for idx, pt in enumerate(payload.camera_points):
            cam_zone = Zone(
                id=pt.get("id") or f"cam-{reg_id}-{idx+1}",
                location_id=new_reg.location_id,
                region_id=new_reg.id,
                name=pt.get("name") or f"{payload.name} Cam {idx+1}",
                capacity=pt.get("capacity", payload.initial_capacity or 100),
                latitude=pt.get("latitude", payload.center_lat),
                longitude=pt.get("longitude", payload.center_lng),
                status=pt.get("status", "active"),
                source_type="real_footage",
                source_path=None
            )
            db.add(cam_zone)
            created_zones.append(cam_zone)
    else:
        # User specified camera_count (e.g. 1..10 cameras)
        cam_count = max(1, payload.camera_count or 1)
        radius = 0.00045 if cam_count > 1 else 0.0
        for idx in range(cam_count):
            if cam_count == 1:
                c_lat, c_lng = payload.center_lat, payload.center_lng
            else:
                angle = (2.0 * math.pi * idx) / float(cam_count)
                c_lat = payload.center_lat + radius * math.sin(angle)
                c_lng = payload.center_lng + radius * math.cos(angle)

            cam_zone = Zone(
                id=f"cam-{reg_id}-{idx+1}",
                location_id=new_reg.location_id,
                region_id=new_reg.id,
                name=f"{payload.name} Cam {idx+1}",
                capacity=payload.initial_capacity or 100,
                latitude=c_lat,
                longitude=c_lng,
                status="active",
                source_type="real_footage",
                source_path=None
            )
            db.add(cam_zone)
            created_zones.append(cam_zone)

    db.commit()
    db.refresh(new_reg)

    zone_schemas = []
    tot_people = 0
    tot_cap = 0
    for z in created_zones:
        camera_manager.ensure_camera(z)
        z_s, _ = _build_zone_schema(z, False, db)
        zone_schemas.append(z_s)
        tot_people += z_s.people_count
        tot_cap += z_s.capacity

    return RegionSchema(
        id=new_reg.id,
        location_id=new_reg.location_id,
        name=new_reg.name,
        description=new_reg.description,
        center_lat=new_reg.center_lat,
        center_lng=new_reg.center_lng,
        zoom_level=new_reg.zoom_level,
        boundary=new_reg.boundary,
        color=new_reg.color,
        is_custom=new_reg.is_custom,
        registered_cameras=len(created_zones),
        active_cameras=len(created_zones),
        total_people=tot_people,
        total_capacity=tot_cap,
        overall_occupancy=round((tot_people / tot_cap) * 100, 2) if tot_cap > 0 else 0.0,
        active_alerts_count=0,
        zones=zone_schemas
    )

@router.put("/regions/{region_id}", response_model=RegionSchema)
async def update_region(region_id: str, payload: RegionUpdateSchema, db: Session = Depends(get_db)):
    reg = db.query(Region).filter(Region.id == region_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Region not found")

    if payload.name:
        reg.name = payload.name
    if payload.description is not None:
        reg.description = payload.description
    if payload.center_lat is not None:
        reg.center_lat = payload.center_lat
    if payload.center_lng is not None:
        reg.center_lng = payload.center_lng
    if payload.zoom_level is not None:
        reg.zoom_level = payload.zoom_level
    if payload.boundary is not None:
        reg.boundary = payload.boundary
    if payload.color is not None:
        reg.color = payload.color

    db.commit()
    db.refresh(reg)

    zones = db.query(Zone).filter(Zone.region_id == reg.id).all()
    zone_schemas = []
    tot_people = 0
    tot_cap = 0
    active_cams = 0
    alert_cnt = 0

    for z in zones:
        z_s, alert_dict = _build_zone_schema(z, False, db)
        zone_schemas.append(z_s)
        tot_people += z_s.people_count
        tot_cap += z_s.capacity
        if z.status == "active":
            active_cams += 1
        if alert_dict:
            alert_cnt += 1

    return RegionSchema(
        id=reg.id,
        location_id=reg.location_id,
        name=reg.name,
        description=reg.description,
        center_lat=reg.center_lat,
        center_lng=reg.center_lng,
        zoom_level=reg.zoom_level,
        boundary=reg.boundary,
        color=reg.color,
        is_custom=reg.is_custom,
        registered_cameras=len(zones),
        active_cameras=active_cams,
        total_people=tot_people,
        total_capacity=tot_cap,
        overall_occupancy=round((tot_people / tot_cap) * 100, 2) if tot_cap > 0 else 0.0,
        active_alerts_count=alert_cnt,
        zones=zone_schemas
    )

@router.delete("/regions/{region_id}")
async def delete_region(region_id: str, db: Session = Depends(get_db)):
    reg = db.query(Region).filter(Region.id == region_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Region not found")
    if not reg.is_custom and reg.id == "reg-entire-campus":
        raise HTTPException(status_code=400, detail="Cannot delete default Entire Campus region")

    zones = db.query(Zone).filter(Zone.region_id == region_id).all()
    for z in zones:
        camera_manager.remove_camera(z.id)
    db.query(Zone).filter(Zone.region_id == region_id).delete()
    db.delete(reg)
    db.commit()
    return {"message": "Region and associated camera points deleted successfully", "region_id": region_id}

# ----------------------------
# Phase 2 Location APIs
# ----------------------------
@router.get("/locations", response_model=List[LocationSchema])
async def get_locations(db: Session = Depends(get_db)):
    locs = db.query(Location).all()
    results = []
    for loc in locs:
        z_count = db.query(Zone).filter(Zone.location_id == loc.id).count()
        results.append(LocationSchema(
            id=loc.id,
            name=loc.name,
            latitude=loc.latitude,
            longitude=loc.longitude,
            zone_count=z_count
        ))
    return results

@router.post("/locations", response_model=LocationSchema)
async def create_location(payload: LocationCreateSchema, db: Session = Depends(get_db)):
    loc_id = payload.id or f"loc-{uuid.uuid4().hex[:8]}"
    existing = db.query(Location).filter(Location.id == loc_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Location ID already exists.")
    
    loc = Location(
        id=loc_id,
        name=payload.name,
        latitude=payload.latitude,
        longitude=payload.longitude
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return LocationSchema(
        id=loc.id,
        name=loc.name,
        latitude=loc.latitude,
        longitude=loc.longitude,
        zone_count=0
    )

@router.get("/locations/{location_id}/summary", response_model=LocationSummarySchema)
async def get_location_summary(location_id: str, db: Session = Depends(get_db)):
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    zones = db.query(Zone).filter(Zone.location_id == location_id).all()
    
    zone_schemas = []
    total_people = 0
    total_capacity = 0
    active_alerts_count = 0

    for idx, z in enumerate(zones):
        people = 0
        if video_processor.is_running and idx == 0:
            people = video_processor.latest_analytics.get("people_count", 0)
        
        cap = z.capacity
        occ = round((people / cap) * 100, 2) if cap > 0 else 0.0
        st = video_processor.analyzer.classify_status(occ) if (video_processor.is_running and idx == 0) else ("LOW" if occ < 50 else ("MODERATE" if occ < 80 else ("HIGH" if occ <= 100 else "CRITICAL")))

        # Evaluate alerts for zone
        alert_dict = alert_engine.evaluate_zone(db, z, people)
        if alert_dict:
            active_alerts_count += 1

        # Record measurement in DB
        analytics_service.record_measurement(db, z.id, people, cap, occ, st)

        total_people += people
        total_capacity += cap

        alert_schema = AlertSchema(**alert_dict) if alert_dict else None

        zone_schemas.append(ZoneSchema(
            id=z.id,
            location_id=z.location_id,
            name=z.name,
            capacity=z.capacity,
            latitude=z.latitude,
            longitude=z.longitude,
            people_count=people,
            occupancy=occ,
            status=st,
            alert=alert_schema
        ))

    overall_occupancy = round((total_people / total_capacity) * 100, 2) if total_capacity > 0 else 0.0

    return LocationSummarySchema(
        location_id=loc.id,
        location_name=loc.name,
        total_people=total_people,
        total_capacity=total_capacity,
        overall_occupancy=overall_occupancy,
        active_alerts_count=active_alerts_count,
        zones=zone_schemas
    )

# ----------------------------
# Phase 2 Monitoring Zone APIs
# ----------------------------
@router.get("/locations/{location_id}/zones", response_model=List[ZoneSchema])
async def get_location_zones(location_id: str, db: Session = Depends(get_db)):
    zones = db.query(Zone).filter(Zone.location_id == location_id).all()
    results = []
    for idx, z in enumerate(zones):
        people = video_processor.latest_analytics.get("people_count", 0) if video_processor.is_running and idx == 0 else 0
        occ = round((people / z.capacity) * 100, 2) if z.capacity > 0 else 0.0
        st = video_processor.analyzer.classify_status(occ)
        results.append(ZoneSchema(
            id=z.id,
            location_id=z.location_id,
            name=z.name,
            capacity=z.capacity,
            latitude=z.latitude,
            longitude=z.longitude,
            people_count=people,
            occupancy=occ,
            status=st
        ))
    return results

@router.post("/locations/{location_id}/zones", response_model=ZoneSchema)
async def create_zone(location_id: str, payload: ZoneCreateSchema, db: Session = Depends(get_db)):
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    
    zone_id = payload.id or f"zone-{uuid.uuid4().hex[:8]}"
    new_zone = Zone(
        id=zone_id,
        location_id=location_id,
        name=payload.name,
        capacity=payload.capacity,
        latitude=payload.latitude,
        longitude=payload.longitude
    )
    db.add(new_zone)
    db.commit()
    db.refresh(new_zone)

    return ZoneSchema(
        id=new_zone.id,
        location_id=new_zone.location_id,
        name=new_zone.name,
        capacity=new_zone.capacity,
        latitude=new_zone.latitude,
        longitude=new_zone.longitude,
        people_count=0,
        occupancy=0.0,
        status="LOW"
    )

@router.put("/zones/{zone_id}", response_model=ZoneSchema)
async def update_zone(zone_id: str, payload: ZoneUpdateSchema, db: Session = Depends(get_db)):
    z = db.query(Zone).filter(Zone.id == zone_id).first()
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    if payload.name:
        z.name = payload.name
    if payload.capacity:
        z.capacity = payload.capacity
        video_processor.set_capacity(payload.capacity)
    if payload.latitude:
        z.latitude = payload.latitude
    if payload.longitude:
        z.longitude = payload.longitude

    db.commit()
    db.refresh(z)

    people = video_processor.latest_analytics.get("people_count", 0) if video_processor.is_running else 0
    occ = round((people / z.capacity) * 100, 2) if z.capacity > 0 else 0.0

    return ZoneSchema(
        id=z.id,
        location_id=z.location_id,
        name=z.name,
        capacity=z.capacity,
        latitude=z.latitude,
        longitude=z.longitude,
        people_count=people,
        occupancy=occ,
        status=video_processor.analyzer.classify_status(occ)
    )

@router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: str, db: Session = Depends(get_db)):
    z = db.query(Zone).filter(Zone.id == zone_id).first()
    if not z:
        raise HTTPException(status_code=404, detail="Zone not found")
    camera_manager.remove_camera(zone_id)
    db.delete(z)
    db.commit()
    return {"message": "Zone deleted successfully", "zone_id": zone_id}

@router.post("/regions/{region_id}/cameras", response_model=CameraDashboardSchema)
async def add_camera_to_region(region_id: str, payload: ZoneCreateSchema, db: Session = Depends(get_db)):
    reg = db.query(Region).filter(Region.id == region_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Region not found")

    cam_id = payload.id or f"cam-{region_id}-{uuid.uuid4().hex[:6]}"
    cam_zone = Zone(
        id=cam_id,
        location_id=reg.location_id,
        region_id=reg.id,
        name=payload.name,
        capacity=payload.capacity,
        latitude=payload.latitude,
        longitude=payload.longitude,
        status=payload.status or "active",
        source_type=payload.source_type or "real_footage",
        source_path=payload.source_path
    )
    db.add(cam_zone)
    db.commit()
    db.refresh(cam_zone)

    camera_manager.ensure_camera(cam_zone)
    return camera_manager.get_camera_dashboard(cam_id)

# ----------------------------
# Phase 2 Heatmap & Analytics APIs
# ----------------------------
@router.get("/locations/{location_id}/heatmap")
async def get_heatmap(location_id: str, db: Session = Depends(get_db)):
    first_zone = db.query(Zone).filter(Zone.location_id == location_id).first()
    live_map = {}
    if first_zone:
        live_map[first_zone.id] = video_processor.latest_analytics
    return heatmap_service.get_location_heatmap_data(db, location_id, live_map)

@router.get("/zones/{zone_id}/history", response_model=HistoricalAnalyticsSchema)
async def get_zone_history(zone_id: str, time_filter: str = Query("today"), db: Session = Depends(get_db)):
    return analytics_service.get_zone_history(db, zone_id, time_filter)

@router.get("/cameras/{camera_id}/history", response_model=CameraHistorySchema)
async def get_camera_history(camera_id: str, time_filter: str = Query("15m"), db: Session = Depends(get_db)):
    return analytics_service.get_camera_history(db, camera_id, time_filter)

@router.get("/regions/{region_id}/history", response_model=RegionCombinedHistorySchema)
async def get_region_combined_history(
    region_id: str,
    time_filter: str = Query("15m"),
    overlap_percent: Optional[float] = Query(None, ge=0.0, le=50.0),
    db: Session = Depends(get_db)
):
    return analytics_service.get_region_combined_history(db, region_id, time_filter, overlap_percent)

# ----------------------------
# Smart Alerts APIs (Multi-Camera, Filtered, Ack/Resolve/Clear)
# ----------------------------
@router.get("/alerts", response_model=List[AlertSchema])
async def get_alerts(
    region_id: Optional[str] = Query(None),
    camera_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    return alert_engine.get_filtered_alerts(
        db=db,
        region_id=region_id,
        camera_id=camera_id,
        severity=severity,
        status=status,
        limit=limit
    )

@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertSchema)
@router.put("/alerts/{alert_id}/acknowledge", response_model=AlertSchema)
async def acknowledge_alert(alert_id: str, user_name: str = Query("Operator"), db: Session = Depends(get_db)):
    updated = alert_engine.acknowledge_alert(db, alert_id, user_name)
    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found")
    return updated

@router.post("/alerts/{alert_id}/resolve", response_model=AlertSchema)
@router.put("/alerts/{alert_id}/resolve", response_model=AlertSchema)
async def resolve_alert(alert_id: str, db: Session = Depends(get_db)):
    updated = alert_engine.resolve_alert(db, alert_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found")
    return updated

@router.delete("/alerts/{alert_id}")
async def clear_alert(alert_id: str, db: Session = Depends(get_db)):
    success = alert_engine.clear_alert(db, alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert cleared successfully", "alert_id": alert_id}

@router.delete("/alerts")
async def clear_all_resolved_alerts(db: Session = Depends(get_db)):
    count = alert_engine.clear_all_resolved(db)
    return {"message": f"Cleared {count} resolved alerts", "cleared_count": count}

# ----------------------------
# Dedicated Camera Dashboard Endpoints
# ----------------------------
@router.get("/cameras", response_model=List[CameraDashboardSchema])
async def get_all_cameras(db: Session = Depends(get_db)):
    camera_manager.initialize_from_db()
    zones = db.query(Zone).all()
    for z in zones:
        camera_manager.ensure_camera(z)
    return camera_manager.get_all_camera_dashboards()

@router.get("/cameras/{camera_id}", response_model=CameraDashboardSchema)
async def get_camera_detail(camera_id: str, db: Session = Depends(get_db)):
    camera_manager.initialize_from_db()
    z = db.query(Zone).filter(Zone.id == camera_id).first()
    if z:
        camera_manager.ensure_camera(z)
    data = camera_manager.get_camera_dashboard(camera_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Camera point '{camera_id}' not found")
    return data

def generate_camera_stream(camera_id: str):
    import time
    while True:
        frame_bytes = camera_manager.get_frame_bytes(camera_id)
        if frame_bytes:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.05)
        else:
            time.sleep(0.1)

@router.get("/cameras/{camera_id}/feed")
async def get_camera_feed(camera_id: str):
    camera_manager.initialize_from_db()
    pipe = camera_manager.get_camera(camera_id)
    if not pipe:
        raise HTTPException(status_code=404, detail="Camera not found")
    return StreamingResponse(
        generate_camera_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@router.post("/cameras/{camera_id}/webcam")
async def start_camera_webcam(camera_id: str, device_index: int = Query(0)):
    success = camera_manager.start_camera_webcam(camera_id, device_index)
    if not success:
        raise HTTPException(status_code=500, detail="Unable to access webcam device for this camera.")
    return {"message": f"Webcam stream started for camera {camera_id}", "status": "live", "camera_id": camera_id}

@router.post("/cameras/{camera_id}/upload_video")
async def upload_camera_video(camera_id: str, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")
    allowed_extensions = {".mp4", ".avi", ".mov", ".mkv"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'")

    file_path = os.path.join(UPLOAD_DIR, f"{camera_id}_video{ext}")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")

    success = camera_manager.start_camera_file(camera_id, file_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to process video for camera.")

    return {"message": f"Video uploaded for camera {camera_id}", "status": "live", "filename": file.filename}

@router.post("/cameras/{camera_id}/stop")
async def stop_camera_stream(camera_id: str):
    success = camera_manager.stop_camera(camera_id)
    if not success:
        raise HTTPException(status_code=404, detail="Camera not found")
    return {"message": f"Camera {camera_id} stopped", "status": "offline"}

@router.post("/cameras/{camera_id}/reconnect")
async def reconnect_camera_stream(camera_id: str):
    success = camera_manager.reconnect_camera(camera_id)
    if not success:
        raise HTTPException(status_code=404, detail="Camera not found")
    return {"message": f"Camera {camera_id} reconnecting initiated", "status": "reconnecting"}

@router.put("/cameras/{camera_id}/capacity", response_model=CameraDashboardSchema)
async def update_camera_capacity(camera_id: str, payload: CameraCapacityUpdateSchema, db: Session = Depends(get_db)):
    data = camera_manager.update_camera_capacity(
        camera_id,
        payload.capacity,
        payload.warning_threshold,
        payload.critical_threshold
    )
    if not data:
        raise HTTPException(status_code=404, detail="Camera not found")

    z = db.query(Zone).filter(Zone.id == camera_id).first()
    if z:
        z.capacity = payload.capacity
        if payload.warning_threshold is not None:
            z.warning_threshold = payload.warning_threshold
        if payload.critical_threshold is not None:
            z.critical_threshold = payload.critical_threshold
        db.commit()

    return data

@router.post("/cameras/{camera_id}/stream_url")
async def attach_camera_stream_url(camera_id: str, payload: CameraStreamUrlSchema):
    camera_manager.initialize_from_db()
    success = camera_manager.start_camera_rtsp(camera_id, payload.stream_url)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to connect to RTSP/HTTP stream URL.")
    return {
        "message": f"Stream URL attached to camera {camera_id}",
        "status": "live",
        "camera_id": camera_id,
        "source_path": payload.stream_url
    }

@router.get("/system/sources")
async def get_system_sources():
    """Return available physical webcams and video files."""
    return camera_manager.scan_available_sources()

