# Docker Deployment Guide for CrowdVision AI

This guide provides instructions for building, running, and managing **CrowdVision AI** inside Docker containers using Docker Compose.

---

## Architecture Overview

CrowdVision AI runs as a multi-container architecture:

```
┌────────────────────────────────────────────────────────┐
│                      Host Machine                      │
│                                                        │
│   Frontend URL: http://localhost:3000                  │
│   Backend Docs: http://localhost:8000/docs             │
└───────────────┬──────────────────────┬─────────────────┘
                │ :3000                │ :8000
                ▼                      ▼
    ┌────────────────────────┐    ┌────────────────────────┐
    │   crowdvision-frontend │    │   crowdvision-backend  │
    │      (Nginx Alpine)    │    │    (Python 3.11-slim)  │
    │                        │    │                        │
    │  • Serves React SPA    │    │  • FastAPI & Uvicorn   │
    │  • Proxies /api/ ──────┼───►│  • YOLOv8 AI Inference │
    │  • Proxies /api/ws/ ───┼───►│  • SQLite with WAL     │
    └────────────────────────┘    └───────────┬────────────┘
                                              │
                                              ▼
                                 ┌─────────────────────────┐
                                 │   Persistent Volumes    │
                                 │  • crowdvision-db       │
                                 │  • crowdvision-uploads  │
                                 └─────────────────────────┘
```

1. **Frontend (`crowdvision-frontend`)**:
   - Built with a multi-stage Dockerfile (`node:20-alpine` -> `nginx:alpine`).
   - Serves the compiled React + Tailwind SPA.
   - Nginx reverse-proxies `/api/` (REST) and `/api/ws/` (WebSocket) directly to the backend over internal container DNS (`backend:8000`).
   - **No CORS issues** and **no port-mapping headaches** because everything is available through port `3000`.

2. **Backend (`crowdvision-backend`)**:
   - Built on `python:3.11-slim` with OpenCV system libraries (`libgl1`, `libglib2.0-0`, `libgomp1`, `ffmpeg`).
   - Bundles the pre-trained `yolov8n.pt` person-detection weights.
   - Automatically initializes and migrates the SQLite database.
   - Stores persistent data inside named Docker volumes so configuration, cameras, custom regions, and uploaded CCTV videos persist between restarts.

---

## Quick Start (Production Mode)

### Prerequisites
Make sure **Docker** and **Docker Compose** are installed and running:
- **Windows / Mac**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure the Docker engine is started.
- **Linux**: Install `docker` and `docker-compose-plugin` (`sudo apt install docker-compose-plugin`).

### 1. Build and Start the Application
From the root directory (`d:\Crowd\crowd-Ai-main`):

```bash
docker compose up --build
```

To run in detached (background) mode:
```bash
docker compose up --build -d
```

### 2. Access the Application

| Service | URL | Description |
|---|---|---|
| **Web Dashboard** | [http://localhost:3000](http://localhost:3000) | Full CrowdVision AI interactive monitoring dashboard |
| **API Swagger UI** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI documentation & test console |
| **Health Check** | [http://localhost:8000/api/health](http://localhost:8000/api/health) | Backend status check (`status: online`) |
| **Frontend Health** | [http://localhost:3000/healthz](http://localhost:3000/healthz) | Nginx probe returning `healthy` |

---

## Daily Operations & Management Commands

### Viewing Container Logs
Follow logs in real-time:
```bash
# All services
docker compose logs -f

# Backend only (YOLO detection, camera pipeline, inference FPS)
docker compose logs -f backend

# Frontend only (Nginx access and error logs)
docker compose logs -f frontend
```

### Checking Service Health & Status
```bash
docker compose ps
```

### Stopping the Services
Stop all containers without deleting data:
```bash
docker compose down
```

### Rebuilding After Changes
```bash
docker compose up --build -d
```

### Resetting Persistent Data (Clean Slate)
To wipe the database volume and video uploads and start completely fresh:
```bash
docker compose down -v
```

---

## Development Mode (Live Hot-Reloading)

If you want to edit backend Python code or frontend React components and see changes immediately without rebuilding Docker images:

```bash
docker compose -f docker-compose.dev.yml up --build
```

In dev mode:
- Backend mounts `./backend` with `uvicorn --reload` on port `8000`.
- Frontend runs Vite development server on port `5173` ([http://localhost:5173](http://localhost:5173)) with Hot Module Replacement (HMR).

---

## Environment Customization

You can customize port numbers or default settings by creating a `.env` file in the root directory:

```bash
cp .env.example .env
```

Available variables in `.env`:
```ini
FRONTEND_PORT=3000        # Host port for web application
BACKEND_PORT=8000         # Host port for REST API / Swagger
DEFAULT_CAPACITY=50       # Default baseline crowd capacity per zone
PROJECT_NAME="CrowdVision AI"
```

---

## Troubleshooting & FAQ

### 1. "Port 3000 or 8000 is already in use"
Change the port mapping in `.env` or run:
```bash
FRONTEND_PORT=3001 BACKEND_PORT=8001 docker compose up
```

### 2. Webcam / Real Video Input Inside Docker
- **Pre-recorded CCTV video**: Video upload via dashboard works out-of-the-box (videos are stored in the `crowdvision-uploads` volume).
- **RTSP / IP Camera Streams**: You can connect any live RTSP/HTTP camera stream URL in the dashboard without any host configuration.
- **Physical USB Webcam (`/dev/video0`) on Linux**: Pass the host webcam device into the backend service in `docker-compose.yml`:
  ```yaml
  backend:
    devices:
      - "/dev/video0:/dev/video0"
  ```

### 3. Model Weights (`yolov8n.pt`)
The `yolov8n.pt` file located in the root repository is automatically copied into the backend Docker image during the build step. If not present, the `ultralytics` library will automatically download it on the first inference pass.
