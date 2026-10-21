import os

class Config:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "CrowdVision AI")
    PROJECT_TITLE: str = os.getenv("PROJECT_TITLE", "Real-Time Crowd Monitoring MVP")
    VERSION: str = os.getenv("VERSION", "1.0.0")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEFAULT_CAPACITY: int = int(os.getenv("DEFAULT_CAPACITY", "50"))
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")

config = Config()

