# CrowdShield — FastAPI Backend

> AI-Powered Early Warning Crowd Stampede Prevention System — Backend API

## Tech Stack

- **Python 3.11+** / **FastAPI** / **Pydantic v2**
- **Neon DB** (Cloud PostgreSQL) via **Async SQLAlchemy 2.0** + **asyncpg**
- **XGBoost** + **scikit-learn** for ML risk scoring
- **NetworkX** for A\* safe evacuation pathfinding
- **WebSocket** real-time telemetry streaming

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env
# Edit .env with your Neon DB connection string

# 4. Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/telemetry` | Ingest ML telemetry from YOLO/ByteTrack pipeline |
| `GET` | `/api/v1/zones` | Get all zone statuses |
| `GET` | `/api/v1/alerts` | Get active crowd alerts |
| `PATCH` | `/api/v1/alerts/{id}/status` | Volunteer alert resolution loop |
| `POST` | `/api/v1/incidents` | Citizen SOS report submission |
| `POST` | `/api/v1/routing/evacuate` | A\* safe evacuation path computation |
| `POST` | `/api/v1/broadcast` | Bhashini multilingual PA broadcast |
| `WS` | `/ws/telemetry` | Real-time telemetry WebSocket stream |

## Architecture

```
app/
├── main.py              # FastAPI app + lifespan
├── core/                # Config + WebSocket manager
├── db/                  # Async SQLAlchemy session
├── models/              # ORM models (Neon DB tables)
├── schemas/             # Pydantic validation schemas
├── api/v1/endpoints/    # REST + WS endpoints
└── services/            # Risk engine, pathfinding, Bhashini
```
