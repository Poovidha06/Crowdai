# ==============================================================================
# CrowdVision AI - Backend Dockerfile
# FastAPI + OpenCV + Ultralytics YOLOv8 Person Detection
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    HOST=0.0.0.0 \
    PORT=8000 \
    YOLO_MODEL_PATH=/app/yolov8n.pt

# Install required system packages for OpenCV, FFmpeg video decoding, and healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first to take advantage of Docker layer caching
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy YOLO model weights if present in root build context
COPY yolov8n.pt* /app/

# Copy backend source code
COPY backend /app/backend

# Create persistent data and video upload directories
RUN mkdir -p /app/data /app/backend/uploads

EXPOSE 8000

# Health check verifies the FastAPI health endpoint responds
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Launch production ASGI server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
