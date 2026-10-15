# CrowdVision AI - Real-Time Crowd Monitoring & Analytics

CrowdVision AI is an intelligent CCTV surveillance and crowd monitoring platform powered by YOLOv8 deep learning and FastAPI. It delivers real-time crowd density detection, automated threshold alerting, multi-camera spatial tracking, and interactive Leaflet map overlays.

---

## Quick Start with Docker

Run the entire application (AI backend + Web dashboard + Nginx reverse proxy) with a single command:

```bash
docker compose up --build
```

Once running:
- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

For full operational commands, hot-reloading dev mode, and volume details, see [DOCKER.md](file:///d:/Crowd/crowd-Ai-main/DOCKER.md).

---

## Architecture & Technology Stack

- **Backend**: Python 3.11, FastAPI, Ultralytics YOLOv8, OpenCV, SQLite (WAL mode), WebSockets
- **Frontend**: React 19, Vite, Tailwind CSS, Recharts, React Leaflet, Lucide Icons
- **Deployment & Proxy**: Docker, Docker Compose, Nginx Alpine

---

## Manual Local Development (Without Docker)

### Backend Setup
```bash
# Navigate to repository root
pip install -r backend/requirements.txt
python -m backend.main
```
The backend will listen on `http://127.0.0.1:8000`.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend dev server will start on `http://localhost:5173`.
