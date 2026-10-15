from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CapacityUpdateSchema(BaseModel):
    capacity: int = Field(..., gt=0, description="Maximum capacity must be greater than zero")

class CrowdAnalyticsSchema(BaseModel):
    people_count: int
    capacity: int
    occupancy: float
    status: str
    timestamp: str
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None

class AlertSchema(BaseModel):
    id: Optional[str] = None
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    camera_id: Optional[str] = None
    camera_name: Optional[str] = None
    region_id: Optional[str] = None
    region_name: Optional[str] = None
    title: str
    message: str
    alert_type: str # "HIGH_OCCUPANCY" | "CAPACITY_EXCEEDED" | "RAPID_GROWTH" | "CAMERA_OFFLINE" | "STALE_DETECTION" | "REGIONAL_CAPACITY_EXCEEDED" | "SUSTAINED_HIGH_OCCUPANCY" | "PIPELINE_ERROR"
    severity: str = "warning" # "info" | "warning" | "critical" | "system"
    people_count: Optional[int] = 0
    capacity: Optional[int] = 0
    occupancy: Optional[float] = 0.0
    threshold_value: Optional[float] = 0.0
    timestamp: Optional[str] = None
    acknowledged: bool = False
    acknowledged_at: Optional[str] = None
    acknowledged_by: Optional[str] = None
    resolved: bool = False
    cleared: bool = False

class LocationCreateSchema(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=2)
    latitude: float
    longitude: float

class LocationSchema(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    zone_count: Optional[int] = 0

    class Config:
        from_attributes = True

class ZoneCreateSchema(BaseModel):
    id: Optional[str] = None
    location_id: Optional[str] = None
    region_id: Optional[str] = None
    name: str = Field(..., min_length=1)
    capacity: int = Field(..., gt=0)
    latitude: float
    longitude: float
    status: Optional[str] = "active"
    source_type: Optional[str] = "real_footage"
    source_path: Optional[str] = None

class ZoneUpdateSchema(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = Field(None, gt=0)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None
    region_id: Optional[str] = None

class ZoneSchema(BaseModel):
    id: str
    location_id: str
    region_id: Optional[str] = None
    region_name: Optional[str] = None
    monitoring_zone: Optional[str] = None
    name: str
    capacity: int
    latitude: float
    longitude: float
    status: str = "active"
    people_count: int = 0
    occupancy: float = 0.0
    status_level: Optional[str] = "LOW"
    crowd_status: Optional[str] = "Normal"
    connection_status: Optional[str] = "live"
    last_processed_time: Optional[str] = None
    fps: Optional[float] = 18.0
    detection_confidence: Optional[float] = 0.88
    has_feed: Optional[bool] = True
    video_feed_url: Optional[str] = None
    active_alerts: Optional[List[dict]] = []
    trend_history: Optional[List[dict]] = []
    alert: Optional[AlertSchema] = None

    class Config:
        from_attributes = True

class CameraDashboardSchema(BaseModel):
    id: str
    name: str
    region_id: str
    region_name: str
    monitoring_zone: str
    connection_status: str # "live" | "offline" | "reconnecting"
    has_feed: bool
    video_feed_url: str
    people_count: int
    capacity: int
    warning_threshold: float = 75.0
    critical_threshold: float = 90.0
    occupancy: float
    crowd_status: str # "Normal" | "Warning" | "Critical"
    last_processed_time: str
    detection_confidence: float
    fps: float
    active_alerts: List[dict] = []
    trend_history: List[dict] = []
    source_type: str = "stream"
    source_path: Optional[str] = None

class CameraCapacityUpdateSchema(BaseModel):
    capacity: int = Field(..., gt=0)
    warning_threshold: Optional[float] = Field(None, gt=0, le=100)
    critical_threshold: Optional[float] = Field(None, gt=0, le=100)

class CameraStreamUrlSchema(BaseModel):
    stream_url: str = Field(..., min_length=4)

class RegionCreateSchema(BaseModel):
    id: Optional[str] = None
    location_id: Optional[str] = "loc-tce-campus"
    name: str = Field(..., min_length=2)
    description: Optional[str] = None
    center_lat: float
    center_lng: float
    zoom_level: Optional[int] = 18
    boundary: str
    color: Optional[str] = "#3b82f6"
    is_custom: Optional[bool] = True
    initial_capacity: Optional[int] = 100
    camera_count: Optional[int] = None
    camera_points: Optional[List[dict]] = None

class RegionUpdateSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    center_lat: Optional[float] = None
    center_lng: Optional[float] = None
    zoom_level: Optional[int] = None
    boundary: Optional[str] = None
    color: Optional[str] = None

class RegionSchema(BaseModel):
    id: str
    location_id: str
    name: str
    description: Optional[str] = None
    center_lat: float
    center_lng: float
    zoom_level: int
    boundary: str
    color: str
    is_custom: bool
    registered_cameras: int = 0
    active_cameras: int = 0
    total_people: int = 0
    total_capacity: int = 0
    overall_occupancy: float = 0.0
    active_alerts_count: int = 0
    zones: Optional[List[ZoneSchema]] = []

    class Config:
        from_attributes = True

class OfflineCameraDetailSchema(BaseModel):
    id: str
    name: str
    monitoring_zone: str
    last_processed_time: Optional[str] = None
    last_known_count: int = 0
    status: str = "offline"

class CombinedRegionAnalyticsSchema(BaseModel):
    region_id: str
    region_name: str
    description: Optional[str] = None
    total_active_cameras: int
    total_offline_cameras: int
    total_registered_cameras: int
    coverage_percentage: float
    raw_people_count: int
    overlap_deduction: int
    overlap_percentage: float
    combined_people_count: int
    is_estimated_aggregate: bool
    overlap_strategy: str
    limitation_note: str
    maximum_capacity: int
    overall_occupancy: float
    warning_cameras_count: int
    critical_cameras_count: int
    total_active_alerts: int
    active_alerts: List[dict] = []
    latest_update_timestamp: str
    crowd_status: str # "Normal" | "Warning" | "Critical"
    offline_cameras: List[OfflineCameraDetailSchema] = []
    data_integrity_warning: Optional[str] = None

    class Config:
        from_attributes = True

class CameraSchema(BaseModel):
    id: str
    zone_id: str
    name: str
    type: str # "webcam" | "uploaded_video"
    status: str = "active"
    source_path: Optional[str] = None

    class Config:
        from_attributes = True

class HistoricalAnalyticsSchema(BaseModel):
    zone_id: str
    zone_name: str
    time_filter: str
    peak_people: int
    avg_people: float
    peak_occupancy: float
    avg_occupancy: float
    high_events_count: int = 0
    critical_events_count: int = 0
    datapoints: List[dict]

class LocationSummarySchema(BaseModel):
    location_id: str
    location_name: str
    total_people: int
    total_capacity: int
    overall_occupancy: float
    active_alerts_count: int
    zones: List[ZoneSchema]

class CameraHistorySchema(BaseModel):
    camera_id: str
    camera_name: str
    region_id: str
    region_name: str
    time_filter: str
    capacity: int
    warning_threshold: float
    critical_threshold: float
    peak_people: int
    avg_people: float
    peak_occupancy: float
    avg_occupancy: float
    datapoints: List[dict]

class RegionCombinedHistorySchema(BaseModel):
    region_id: str
    region_name: str
    time_filter: str
    maximum_capacity: int
    peak_combined_people: int
    avg_combined_people: float
    peak_occupancy: float
    overlap_percentage: float
    datapoints: List[dict]
    camera_series: List[dict]
    alert_events: List[dict]
