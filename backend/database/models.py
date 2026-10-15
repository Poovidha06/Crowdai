from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.database.database import Base

class Region(Base):
    __tablename__ = "regions"

    id = Column(String, primary_key=True, index=True)
    location_id = Column(String, ForeignKey("locations.id"), nullable=False, default="loc-tce-campus")
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    center_lat = Column(Float, nullable=False, default=9.9252)
    center_lng = Column(Float, nullable=False, default=78.1198)
    zoom_level = Column(Integer, nullable=False, default=18)
    boundary = Column(String, nullable=False) # JSON encoded string: [[lat, lng], ...]
    color = Column(String, nullable=False, default="#3b82f6")
    is_custom = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    location = relationship("Location", back_populates="regions")
    zones = relationship("Zone", back_populates="region", cascade="all, delete-orphan")

class Location(Base):
    __tablename__ = "locations"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False, default=9.9252)
    longitude = Column(Float, nullable=False, default=78.1198)
    max_capacity = Column(Integer, nullable=False, default=100)
    warning_threshold = Column(Float, nullable=False, default=80.0)
    critical_threshold = Column(Float, nullable=False, default=100.0)
    overlap_deduction_percent = Column(Float, nullable=False, default=15.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    zones = relationship("Zone", back_populates="location", cascade="all, delete-orphan")
    regions = relationship("Region", back_populates="location", cascade="all, delete-orphan")

class Zone(Base):
    __tablename__ = "zones"

    id = Column(String, primary_key=True, index=True)
    location_id = Column(String, ForeignKey("locations.id"), nullable=False)
    region_id = Column(String, ForeignKey("regions.id"), nullable=True)
    name = Column(String, nullable=False)
    capacity = Column(Integer, nullable=False, default=50)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, default="online") # "online" | "offline" | "warning" | "critical"
    source_type = Column(String, default="webcam") # "webcam" | "file" | "cctv_ip"
    source_path = Column(String, nullable=True, default="0")
    enabled = Column(Boolean, default=True)
    warning_threshold = Column(Float, default=80.0)
    critical_threshold = Column(Float, default=100.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    location = relationship("Location", back_populates="zones")
    region = relationship("Region", back_populates="zones")
    cameras = relationship("Camera", back_populates="zone", cascade="all, delete-orphan")
    measurements = relationship("CrowdMeasurement", back_populates="zone", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="zone", cascade="all, delete-orphan")

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String, primary_key=True, index=True)
    zone_id = Column(String, ForeignKey("zones.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False, default="webcam") # "webcam" | "uploaded_video"
    status = Column(String, default="active")
    source_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    zone = relationship("Zone", back_populates="cameras")

class CrowdMeasurement(Base):
    __tablename__ = "crowd_measurements"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    zone_id = Column(String, ForeignKey("zones.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    people_count = Column(Integer, nullable=False, default=0)
    capacity = Column(Integer, nullable=False, default=50)
    occupancy = Column(Float, nullable=False, default=0.0)
    status = Column(String, nullable=False, default="LOW")

    zone = relationship("Zone", back_populates="measurements")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, index=True)
    zone_id = Column(String, ForeignKey("zones.id"), nullable=True)
    camera_id = Column(String, nullable=True, index=True)
    camera_name = Column(String, nullable=True)
    region_id = Column(String, nullable=True, index=True)
    region_name = Column(String, nullable=True)
    type = Column(String, nullable=False, index=True)  # "HIGH_OCCUPANCY" | "CAPACITY_EXCEEDED" | "RAPID_GROWTH" | "CAMERA_OFFLINE" | "STALE_DETECTION" | "REGIONAL_CAPACITY_EXCEEDED" | "SUSTAINED_HIGH_OCCUPANCY" | "PIPELINE_ERROR"
    severity = Column(String, nullable=False, default="warning", index=True) # "info" | "warning" | "critical" | "system"
    message = Column(String, nullable=False)
    people_count = Column(Integer, nullable=True, default=0)
    capacity = Column(Integer, nullable=True, default=0)
    occupancy = Column(Float, nullable=True, default=0.0)
    threshold_value = Column(Float, nullable=True, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged = Column(Boolean, default=False, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String, nullable=True)
    resolved = Column(Boolean, default=False, index=True)
    cleared = Column(Boolean, default=False, index=True)

    zone = relationship("Zone", back_populates="alerts")

class RegionMeasurement(Base):
    __tablename__ = "region_measurements"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    region_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    combined_people_count = Column(Integer, nullable=False, default=0)
    raw_people_count = Column(Integer, nullable=False, default=0)
    overlap_deduction = Column(Integer, nullable=False, default=0)
    capacity = Column(Integer, nullable=False, default=100)
    occupancy = Column(Float, nullable=False, default=0.0)
    active_cameras = Column(Integer, nullable=False, default=0)
    offline_cameras = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="Normal")

