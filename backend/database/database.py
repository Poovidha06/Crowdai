import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

DB_PATH = os.getenv("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "..", "crowdvision.db"))
_default_db = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "crowdvision.db"))
_target_db = os.path.abspath(DB_PATH)

if _target_db != _default_db and not os.path.exists(_target_db) and os.path.exists(_default_db):
    try:
        os.makedirs(os.path.dirname(_target_db), exist_ok=True)
        import shutil
        shutil.copy2(_default_db, _target_db)
    except Exception:
        pass

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_target_db}")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 30  # 30-second timeout to prevent SQLite database lock crashes
    }
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import json
    from backend.database.models import Location, Region, Zone, Camera
    
    # Run SQLite pragma/migrations to ensure columns exist
    with engine.connect() as conn:
        try:
            conn.execute(Base.metadata.tables["locations"].select().limit(1))
        except Exception:
            pass

    Base.metadata.create_all(bind=engine)

    # Run SQLite pragma/migrations to ensure newly added columns exist in alerts
    with engine.connect() as conn:
        for col_name, col_type in [
            ("camera_id", "TEXT"),
            ("camera_name", "TEXT"),
            ("region_id", "TEXT"),
            ("region_name", "TEXT"),
            ("people_count", "INTEGER DEFAULT 0"),
            ("capacity", "INTEGER DEFAULT 0"),
            ("occupancy", "REAL DEFAULT 0.0"),
            ("threshold_value", "REAL DEFAULT 0.0"),
            ("acknowledged", "BOOLEAN DEFAULT 0"),
            ("acknowledged_at", "DATETIME"),
            ("acknowledged_by", "TEXT"),
            ("cleared", "BOOLEAN DEFAULT 0")
        ]:
            try:
                from sqlalchemy import text
                conn.execute(text(f"ALTER TABLE alerts ADD COLUMN {col_name} {col_type};"))
                conn.commit()
            except Exception:
                pass
    
    db = SessionLocal()
    try:
        location_id = "loc-tce-campus"
        loc = db.query(Location).filter_by(id=location_id).first()
        if not loc:
            loc = Location(
                id=location_id,
                name="TCE Campus",
                latitude=9.9252,
                longitude=78.1198,
                max_capacity=1000
            )
            db.add(loc)
            db.commit()

        # Predefined Regions
        predefined_regions = [
            {
                "id": "reg-entire-campus",
                "name": "Entire Campus",
                "description": "Full TCE Campus monitoring perimeter",
                "center_lat": 9.9252,
                "center_lng": 78.1198,
                "zoom_level": 16,
                "boundary": json.dumps([
                    [9.9282, 78.1165],
                    [9.9282, 78.1235],
                    [9.9220, 78.1235],
                    [9.9220, 78.1165]
                ]),
                "color": "#3b82f6",
                "is_custom": False
            },
            {
                "id": "reg-main-entrance",
                "name": "Main Entrance",
                "description": "Primary campus entry gate, vehicle barrier, and visitor checkpoint",
                "center_lat": 9.9272,
                "center_lng": 78.1192,
                "zoom_level": 18,
                "boundary": json.dumps([
                    [9.9277, 78.1187],
                    [9.9277, 78.1197],
                    [9.9267, 78.1197],
                    [9.9267, 78.1187]
                ]),
                "color": "#10b981",
                "is_custom": False
            },
            {
                "id": "reg-academic-block",
                "name": "Academic Block",
                "description": "Central classrooms, lecture halls, quadrangle, and academic corridors",
                "center_lat": 9.9258,
                "center_lng": 78.1205,
                "zoom_level": 18,
                "boundary": json.dumps([
                    [9.9264, 78.1199],
                    [9.9264, 78.1213],
                    [9.9252, 78.1213],
                    [9.9252, 78.1199]
                ]),
                "color": "#6366f1",
                "is_custom": False
            },
            {
                "id": "reg-library",
                "name": "Library",
                "description": "Central library reading halls, reference sections, and book stacks",
                "center_lat": 9.9248,
                "center_lng": 78.1216,
                "zoom_level": 18,
                "boundary": json.dumps([
                    [9.9253, 78.1210],
                    [9.9253, 78.1223],
                    [9.9243, 78.1223],
                    [9.9243, 78.1210]
                ]),
                "color": "#ec4899",
                "is_custom": False
            },
            {
                "id": "reg-canteen",
                "name": "Canteen",
                "description": "Student cafeteria, dining court, and food counters",
                "center_lat": 9.9236,
                "center_lng": 78.1202,
                "zoom_level": 18,
                "boundary": json.dumps([
                    [9.9242, 78.1196],
                    [9.9242, 78.1209],
                    [9.9230, 78.1209],
                    [9.9230, 78.1196]
                ]),
                "color": "#f59e0b",
                "is_custom": False
            },
            {
                "id": "reg-auditorium",
                "name": "Auditorium",
                "description": "Grand convention hall, stage, and event foyer",
                "center_lat": 9.9246,
                "center_lng": 78.1186,
                "zoom_level": 18,
                "boundary": json.dumps([
                    [9.9252, 78.1180],
                    [9.9252, 78.1193],
                    [9.9240, 78.1193],
                    [9.9240, 78.1180]
                ]),
                "color": "#8b5cf6",
                "is_custom": False
            },
            {
                "id": "reg-parking",
                "name": "Parking Area",
                "description": "Two-wheeler bays, staff parking, and northern vehicle transit",
                "center_lat": 9.9265,
                "center_lng": 78.1178,
                "zoom_level": 18,
                "boundary": json.dumps([
                    [9.9272, 78.1172],
                    [9.9272, 78.1185],
                    [9.9258, 78.1185],
                    [9.9258, 78.1172]
                ]),
                "color": "#06b6d4",
                "is_custom": False
            }
        ]

        for reg_data in predefined_regions:
            existing_reg = db.query(Region).filter_by(id=reg_data["id"]).first()
            if not existing_reg:
                new_reg = Region(
                    id=reg_data["id"],
                    location_id=location_id,
                    name=reg_data["name"],
                    description=reg_data["description"],
                    center_lat=reg_data["center_lat"],
                    center_lng=reg_data["center_lng"],
                    zoom_level=reg_data["zoom_level"],
                    boundary=reg_data["boundary"],
                    color=reg_data["color"],
                    is_custom=reg_data["is_custom"]
                )
                db.add(new_reg)

        db.commit()

        # Seed predefined camera points / zones
        predefined_cameras = [
            # Main Entrance
            {"id": "cam-main-entry", "region_id": "reg-main-entrance", "name": "CAM-01 Main Gate Entry", "capacity": 100, "latitude": 9.9274, "longitude": 78.1190, "status": "active"},
            {"id": "cam-main-barrier", "region_id": "reg-main-entrance", "name": "CAM-02 Barrier Turnstile", "capacity": 80, "latitude": 9.9270, "longitude": 78.1194, "status": "active"},
            # Academic Block
            {"id": "cam-acad-quad", "region_id": "reg-academic-block", "name": "CAM-03 Main Quadrangle", "capacity": 200, "latitude": 9.9259, "longitude": 78.1204, "status": "active"},
            {"id": "cam-acad-corridor", "region_id": "reg-academic-block", "name": "CAM-04 East Corridor", "capacity": 120, "latitude": 9.9255, "longitude": 78.1209, "status": "active"},
            # Library
            {"id": "cam-lib-reading", "region_id": "reg-library", "name": "CAM-05 Reading Hall", "capacity": 150, "latitude": 9.9249, "longitude": 78.1215, "status": "active"},
            {"id": "cam-lib-entry", "region_id": "reg-library", "name": "CAM-06 Entrance Turnstile", "capacity": 60, "latitude": 9.9246, "longitude": 78.1219, "status": "standby"},
            # Canteen
            {"id": "cam-cant-court", "region_id": "reg-canteen", "name": "CAM-07 Food Court Dining", "capacity": 180, "latitude": 9.9237, "longitude": 78.1201, "status": "active"},
            {"id": "cam-cant-counter", "region_id": "reg-canteen", "name": "CAM-08 Serving Counters", "capacity": 90, "latitude": 9.9233, "longitude": 78.1205, "status": "active"},
            # Auditorium
            {"id": "cam-audi-hall", "region_id": "reg-auditorium", "name": "CAM-09 Main Auditorium Hall", "capacity": 350, "latitude": 9.9247, "longitude": 78.1185, "status": "active"},
            {"id": "cam-audi-foyer", "region_id": "reg-auditorium", "name": "CAM-10 Entrance Foyer", "capacity": 100, "latitude": 9.9243, "longitude": 78.1189, "status": "standby"},
            # Parking Area
            {"id": "cam-park-two", "region_id": "reg-parking", "name": "CAM-11 Two-Wheeler Bay", "capacity": 150, "latitude": 9.9267, "longitude": 78.1176, "status": "active"},
            {"id": "cam-park-four", "region_id": "reg-parking", "name": "CAM-12 Four-Wheeler North", "capacity": 80, "latitude": 9.9262, "longitude": 78.1181, "status": "active"}
        ]

        for cam_data in predefined_cameras:
            existing_cam = db.query(Zone).filter_by(id=cam_data["id"]).first()
            if not existing_cam:
                new_zone = Zone(
                    id=cam_data["id"],
                    location_id=location_id,
                    region_id=cam_data["region_id"],
                    name=cam_data["name"],
                    capacity=cam_data["capacity"],
                    latitude=cam_data["latitude"],
                    longitude=cam_data["longitude"],
                    status=cam_data["status"]
                )
                db.add(new_zone)
            else:
                # Update region_id if missing
                if not existing_cam.region_id:
                    existing_cam.region_id = cam_data["region_id"]
                    existing_cam.status = cam_data["status"]

        db.commit()
    finally:
        db.close()





