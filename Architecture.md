# 🏗️ CrowdShield — System Architecture

> **AI-Powered Crowd Intelligence & Stampede Prevention Platform**
> Real-time crowd density monitoring, predictive risk forecasting, and multi-lingual emergency response — purpose-built for India's largest public venues.

---

## Table of Contents

1. [High-Level System Overview](#1-high-level-system-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Database Schema](#4-database-schema)
5. [ML & AI Pipeline](#5-ml--ai-pipeline)
6. [Real-Time Communication](#6-real-time-communication)
7. [API Specification](#7-api-specification)
8. [Authentication & RBAC](#8-authentication--rbac)
9. [Data Flow — End to End](#9-data-flow--end-to-end)
10. [Deployment Topology](#10-deployment-topology)
11. [Technology Stack Reference](#11-technology-stack-reference)

---

## 1. High-Level System Overview

```mermaid
graph TB
    subgraph CLIENT["🖥️ Client Layer"]
        direction TB
        ADMIN["Admin Command Deck<br/><i>React 19 + TypeScript</i>"]
        CITIZEN["Citizen Safety Portal<br/><i>React 19 + TypeScript</i>"]
        VOLUNTEER["Volunteer Task Board<br/><i>React 19 + TypeScript</i>"]
    end

    subgraph GATEWAY["🔀 API Layer — FastAPI"]
        REST["REST API v1<br/><i>/api/v1/*</i>"]
        WSE["WebSocket<br/><i>/api/v1/ws/telemetry</i>"]
        JWT["JWT Auth Guard<br/><i>HS256 + bcrypt</i>"]
    end

    subgraph INTELLIGENCE["🧠 Intelligence Layer"]
        XGBOOST["XGBoost Risk Engine<br/><i>6-feature scoring + safety overrides</i>"]
        RIDGE["Predictive Forecaster<br/><i>Ridge Autoregression (10 min)</i>"]
        ASTAR["A* Pathfinder<br/><i>NetworkX + live density penalties</i>"]
        GEMINI["Google Gemini<br/><i>NDRF post-incident summaries</i>"]
        SARVAM["Sarvam AI<br/><i>Bulbul v3 multilingual TTS</i>"]
        AGGREGATOR["Telemetry Aggregator<br/><i>Multi-camera overlap dedup</i>"]
    end

    subgraph DATA["🗄️ Data Layer"]
        NEON[("Neon PostgreSQL<br/><i>Async via asyncpg</i>")]
        GRAPH["venue_graph.json<br/><i>Spatial topology</i>"]
        MODEL_FILE["crowdshield_xgb_model.json<br/><i>Trained XGBoost weights</i>"]
    end

    subgraph EDGE["📷 Edge Layer"]
        CAM1["CCTV Camera 1"]
        CAM2["CCTV Camera 2"]
        CAMN["CCTV Camera N"]
        YOLO["YOLOv8 Inference<br/><i>On-device / edge node</i>"]
    end

    ADMIN -->|"HTTP + WS"| GATEWAY
    CITIZEN -->|"HTTP + WS"| GATEWAY
    VOLUNTEER -->|"HTTP"| GATEWAY

    REST --> INTELLIGENCE
    WSE -->|"Push events"| CLIENT

    XGBOOST --> NEON
    RIDGE --> NEON
    ASTAR --> GRAPH
    AGGREGATOR --> NEON

    CAM1 --> YOLO
    CAM2 --> YOLO
    CAMN --> YOLO
    YOLO -->|"POST /telemetry"| REST

    GEMINI -.->|"HTTPS"| GATEWAY
    SARVAM -.->|"HTTPS"| GATEWAY

    style CLIENT fill:#f0f4ff,stroke:#2B5FA6,stroke-width:2px
    style GATEWAY fill:#fff8f0,stroke:#C9501C,stroke-width:2px
    style INTELLIGENCE fill:#f0fff4,stroke:#3F7D5C,stroke-width:2px
    style DATA fill:#fdf5f0,stroke:#B3242E,stroke-width:2px
    style EDGE fill:#fafafa,stroke:#6B7062,stroke-width:2px
```

---

## 2. Frontend Architecture

### 2.1 Source Tree

```
crowdshield-frontend/src/
├── main.tsx                          # ReactDOM entry + service worker registration
├── App.tsx                           # Central controller: state, routing, WS, polling
├── index.css                         # Design tokens + Tailwind config
├── types.ts                          # All TypeScript interfaces
│
├── context/
│   └── AuthContext.tsx                # JWT auth provider (login, logout, role, token)
│
├── components/
│   ├── admin/
│   │   ├── DashboardView.tsx          # Executive command center overview
│   │   ├── LiveMapView.tsx            # Leaflet GIS map with zone polygons
│   │   ├── CamerasView.tsx            # CCTV grid with YOLO bounding boxes
│   │   ├── AlertsView.tsx             # Real-time alert feed + Sentinel AI panel
│   │   ├── AnalyticsView.tsx          # Historical trends + Gemini AI summaries
│   │   ├── DigitalTwinView.tsx        # 2D/3D venue topology + A* evacuation
│   │   ├── ThreeDigitalTwinCanvas.tsx # Three.js WebGL 3D isometric view
│   │   └── EmergencyBroadcastModal.tsx# Multi-channel crisis PA generator
│   │
│   ├── citizen/
│   │   ├── CitizenPortalView.tsx      # Mobile-first safety UI + SOS button
│   │   ├── CitizenEvacuationMap.tsx    # Turn-by-turn evacuation routing
│   │   ├── EvacuationDrillMode.tsx    # Gamified drill with compass + audio
│   │   └── VolunteerTasksView.tsx     # On-site crowd dispatch task board
│   │
│   ├── common/
│   │   ├── AuthView.tsx               # Login / Register with parallax hero
│   │   ├── HeaderTopBar.tsx           # Venue switcher, search, language, mic
│   │   ├── LeftSidebar.tsx            # Desktop nav + mobile drawer
│   │   ├── RoleSwitcher.tsx           # Floating role toggle + session info
│   │   ├── VoiceAssistantModal.tsx    # Web Speech API voice commands
│   │   ├── ToastContainer.tsx         # Role-aware notification stack
│   │   ├── SystemLogsModal.tsx        # Live backend event console
│   │   └── SupportModal.tsx           # Emergency hotlines + diagnostics
│   │
│   └── ui/
│       └── parallax-hero-images.tsx   # Framer Motion parallax component
│
├── services/
│   └── websocket.ts                   # Singleton WS manager + auto-reconnect
│
├── utils/
│   ├── api.ts                         # Axios instance + JWT interceptors
│   ├── geofence.ts                    # Turf.js proximity to danger zones
│   ├── nlpCommandParser.ts            # Voice transcript → action parser
│   └── speech.ts                      # Sarvam AI TTS + browser fallback
│
├── i18n/
│   ├── dashboard.ts                   # Admin UI translations (5 languages)
│   └── citizen.ts                     # Citizen UI translations (5 languages)
│
├── data/
│   ├── mockData.ts                    # Development mock datasets
│   └── venueTopology.ts              # Client-side venue graph reference
│
└── lib/
    └── utils.ts                       # clsx + tailwind-merge helper
```

### 2.2 Component Architecture

```mermaid
graph TB
    subgraph ENTRY["Entry"]
        MAIN["main.tsx<br/><i>ReactDOM + SW</i>"]
    end

    subgraph AUTH_LAYER["Auth Layer"]
        AUTH_CTX["AuthContext<br/><i>JWT + role + token</i>"]
        AUTH_VIEW["AuthView<br/><i>Login / Register</i>"]
    end

    subgraph APP_CORE["App.tsx — Central Controller"]
        STATE["State Hub<br/><i>venues, zones, alerts<br/>cctvFeeds, toasts, logs</i>"]
        ROUTER["Route Switch<br/><i>viewMode + adminRoute</i>"]
        WS_SUB["WS Subscriber<br/><i>wsService.subscribe()</i>"]
        EVENT_BUS["Window Event Bus<br/><i>CustomEvent dispatch</i>"]
    end

    subgraph ADMIN_VIEWS["Admin Views"]
        DASH["DashboardView"]
        MAP["LiveMapView"]
        CAMS["CamerasView"]
        ALERTS_V["AlertsView"]
        ANALYTICS["AnalyticsView"]
        TWIN["DigitalTwinView"]
    end

    subgraph CITIZEN_VIEWS["Citizen Views"]
        PORTAL["CitizenPortalView"]
        EVAC_MAP["CitizenEvacuationMap"]
        DRILL["EvacuationDrillMode"]
        VOL["VolunteerTasksView"]
    end

    subgraph SHARED["Shared Shell"]
        HEADER["HeaderTopBar"]
        SIDEBAR["LeftSidebar"]
        ROLE_SW["RoleSwitcher"]
        VOICE["VoiceAssistantModal"]
        TOAST["ToastContainer"]
        LOGS["SystemLogsModal"]
        BROADCAST["EmergencyBroadcastModal"]
    end

    MAIN --> AUTH_CTX
    AUTH_CTX -->|"Unauthenticated"| AUTH_VIEW
    AUTH_CTX -->|"Authenticated"| APP_CORE

    ROUTER -->|"viewMode = admin"| ADMIN_VIEWS
    ROUTER -->|"viewMode = citizen"| CITIZEN_VIEWS

    APP_CORE --> SHARED

    style ENTRY fill:#fafafa,stroke:#DEDBD1
    style AUTH_LAYER fill:#fff8f0,stroke:#D9A02D
    style APP_CORE fill:#f0f4ff,stroke:#2B5FA6,stroke-width:2px
    style ADMIN_VIEWS fill:#f0fff4,stroke:#3F7D5C
    style CITIZEN_VIEWS fill:#fff5f0,stroke:#C9501C
    style SHARED fill:#f5f5f5,stroke:#6B7062
```

### 2.3 Routing Model

No React Router is used — routing is driven entirely by state:

| State Variable | Values | Controls |
|---|---|---|
| `viewMode` | `'auth'` · `'admin'` · `'citizen'` | Top-level view switch |
| `adminRoute` | `'dashboard'` · `'map'` · `'cameras'` · `'alerts'` · `'analytics'` · `'twin'` | Admin sub-page |

### 2.4 Layout Hierarchy

```
┌───────────────────────────────────────────────────────────────┐
│  Root Container (flex-row, h-screen)                          │
│ ┌──────────────┬────────────────────────────────────────────┐ │
│ │              │  Content Column (flex-col, flex-1)         │ │
│ │              │ ┌────────────────────────────────────────┐ │ │
│ │  LeftSidebar │ │  HeaderTopBar                          │ │ │
│ │  (w-72)      │ │  venue switcher · search · language    │ │ │
│ │              │ ├────────────────────────────────────────┤ │ │
│ │  • Logo      │ │                                        │ │ │
│ │  • Status    │ │  <main> — Dynamic Admin View           │ │ │
│ │  • Nav       │ │  DashboardView | LiveMapView | ...     │ │ │
│ │  • Emergency │ │                                        │ │ │
│ │    PA Button │ │  Overlays: Toasts, Voice, Broadcast    │ │ │
│ │              │ │                                        │ │ │
│ └──────────────┴────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
  Mobile: Sidebar collapses → fixed drawer (z-50, slide-in-from-left)
```

### 2.5 Real-Time Data Ingestion

```mermaid
graph LR
    subgraph BACKEND["Backend"]
        WS_SERVER["WebSocket Server"]
    end

    subgraph FRONTEND["Frontend"]
        WS_SERVICE["wsService<br/><i>Singleton</i>"]
        APP["App.tsx<br/><i>subscribe()</i>"]
        COMPONENTS["View Components"]
    end

    WS_SERVER -->|"ws://host/api/v1/ws/telemetry?token="| WS_SERVICE
    WS_SERVICE -->|"TELEMETRY_UPDATE"| APP
    WS_SERVICE -->|"NEW_ALERT"| APP
    WS_SERVICE -->|"SCENARIO_TRIGGERED"| APP
    WS_SERVICE -->|"INTERVENTION_DISPATCHED"| APP
    WS_SERVICE -->|"RESOLVED_BY_VOLUNTEER"| APP
    WS_SERVICE -->|"VENUE_SWITCHED"| APP
    APP -->|"setState()"| COMPONENTS

    style BACKEND fill:#f0fff4,stroke:#3F7D5C
    style FRONTEND fill:#f0f4ff,stroke:#2B5FA6
```

The WebSocket service uses **exponential backoff** reconnection (max 8 seconds) and supports zone-level subscriptions.

---

## 3. Backend Architecture

### 3.1 Source Tree

```
crowdshield-backend/
├── app/
│   ├── main.py                        # FastAPI app factory + lifespan + CORS
│   │
│   ├── api/
│   │   ├── deps.py                    # Dependency injection (DB session, JWT, RBAC)
│   │   └── v1/
│   │       ├── api.py                 # Aggregated v1 router
│   │       ├── websocket.py           # WS endpoint with JWT handshake
│   │       └── endpoints/
│   │           ├── auth.py            # Login + citizen registration
│   │           ├── venues.py          # Multi-venue CRUD + active switching
│   │           ├── zones.py           # Zone status queries
│   │           ├── telemetry.py       # ML telemetry ingestion pipeline
│   │           ├── alerts.py          # Alert queries + volunteer resolution
│   │           ├── incidents.py       # Citizen SOS + upvoting
│   │           ├── broadcast.py       # Sarvam TTS + SMS + social dispatch
│   │           ├── interventions.py   # Countermeasures + scenario toggle
│   │           ├── routing.py         # A* evacuation + 3D twin queries
│   │           └── analytics.py       # History + Gemini summaries + forecast
│   │
│   ├── core/
│   │   ├── config.py                  # Pydantic BaseSettings (.env loader)
│   │   ├── security.py                # bcrypt hashing + PyJWT token utils
│   │   └── websocket.py               # ConnectionManager singleton
│   │
│   ├── db/
│   │   ├── base.py                    # SQLAlchemy DeclarativeBase
│   │   └── session.py                 # Async engine + sessionmaker (Neon PG)
│   │
│   ├── models/
│   │   ├── venue.py                   # Venue + Zone ORM
│   │   ├── alert.py                   # CrowdAlert ORM
│   │   ├── camera.py                  # CCTVFeed ORM
│   │   ├── incident.py                # CitizenReport ORM
│   │   ├── telemetry.py               # TelemetryLog ORM
│   │   ├── user.py                    # User + UserRole ORM
│   │   └── audit.py                   # AuditLog ORM
│   │
│   ├── schemas/                       # Pydantic request/response models
│   │   ├── zone.py
│   │   ├── alert.py
│   │   ├── incident.py
│   │   ├── telemetry.py
│   │   ├── token.py
│   │   └── user.py
│   │
│   └── services/
│       ├── risk_engine.py             # XGBoost scoring + safety overrides
│       ├── predictive_engine.py       # Ridge autoregression (10-min forecast)
│       ├── pathfinding.py             # Dynamic A* over venue graph
│       └── telemetry_aggregator.py    # Multi-camera overlap deduplication
│
├── scripts/
│   ├── seed_venue.py                  # Seeds SOA ITER + Kalinga Stadium
│   ├── simulate_telemetry.py          # Telemetry simulator (normal + crisis)
│   └── cleanup_venues.py             # DB cleanup utility
│
├── venue_graph.json                   # Spatial graph topology
├── crowdshield_xgb_model.json         # Trained XGBoost weights
├── crowdshield_training_data.csv      # 2,500-row synthetic training set
├── train_xgboost_model.py             # XGBoost training script
├── generate_synthetic_data.py         # Physics-grounded data generator
├── requirements.txt
└── .env
```

### 3.2 Application Architecture

```mermaid
graph TB
    subgraph FASTAPI["FastAPI Application"]
        LIFESPAN["Lifespan Manager<br/><i>DB init + admin seed</i>"]
        CORS_MW["CORS Middleware"]
        HEALTH["GET /health"]

        subgraph ROUTER["API v1 Router — /api/v1"]
            R_AUTH["/auth<br/><i>login · register</i>"]
            R_VENUES["/venues<br/><i>CRUD · active switch</i>"]
            R_ZONES["/zones<br/><i>Status queries</i>"]
            R_TELEM["/telemetry<br/><i>ML ingestion pipeline</i>"]
            R_ALERTS["/alerts<br/><i>Feed · resolution</i>"]
            R_INCIDENTS["/incidents<br/><i>Citizen SOS · upvote</i>"]
            R_BROADCAST["/broadcast<br/><i>PA · SMS · TTS · social</i>"]
            R_INTERVENE["/interventions<br/><i>Dispatch · scenario</i>"]
            R_ROUTING["/routing<br/><i>A* evacuation · twin</i>"]
            R_ANALYTICS["/analytics<br/><i>History · Gemini · forecast</i>"]
            R_WS["WS /ws/telemetry<br/><i>Real-time push</i>"]
        end

        subgraph DEPS["Dependency Injection"]
            D_DB["get_db<br/><i>Async session</i>"]
            D_USER["get_current_user<br/><i>JWT decode</i>"]
            D_ADMIN["get_current_active_admin<br/><i>ADMIN role guard</i>"]
            D_CITIZEN["get_current_active_citizen<br/><i>CITIZEN + VOLUNTEER + ADMIN</i>"]
        end

        subgraph SERVICES["Service Layer"]
            S_RISK["RiskEngine<br/><i>XGBoost + overrides</i>"]
            S_PREDICT["PredictiveEngine<br/><i>Ridge AR(3)</i>"]
            S_PATH["Pathfinder<br/><i>A* + NetworkX</i>"]
            S_AGG["TelemetryAggregator<br/><i>Overlap dedup</i>"]
        end

        subgraph ORM["ORM Models"]
            M_VENUE["Venue"]
            M_ZONE["Zone"]
            M_ALERT["CrowdAlert"]
            M_CCTV["CCTVFeed"]
            M_TELEM["TelemetryLog"]
            M_INCIDENT["CitizenReport"]
            M_USER["User"]
            M_AUDIT["AuditLog"]
        end
    end

    DB[("Neon PostgreSQL<br/><i>asyncpg driver</i>")]

    LIFESPAN --> ORM
    ROUTER --> DEPS
    ROUTER --> SERVICES
    SERVICES --> ORM
    ORM --> DB

    style FASTAPI fill:#fafafa,stroke:#22271F,stroke-width:2px
    style ROUTER fill:#f0f4ff,stroke:#2B5FA6
    style DEPS fill:#fff8f0,stroke:#D9A02D
    style SERVICES fill:#f0fff4,stroke:#3F7D5C
    style ORM fill:#fdf5f0,stroke:#B3242E
```

---

## 4. Database Schema

```mermaid
erDiagram
    USERS {
        uuid id PK
        string username "email, unique"
        string hashed_password
        enum role "ADMIN | CITIZEN | VOLUNTEER"
        bool is_active
    }

    VENUES {
        string id PK "e.g. soa-iter-01"
        string name
        string location
        float gps_center_lat
        float gps_center_lng
        int total_capacity
    }

    ZONES {
        string id PK
        string venue_id FK
        string code
        string name
        string sector
        int capacity_limit
        int current_headcount
        float density "persons per m²"
        float flow_rate
        int risk_score "0–100"
        enum risk_level "safe | caution | warning | critical"
        enum trend "up | down | stable"
        enum gate_status "open | restricted | closed | one_way | evacuation"
        json coordinates_json "polygon [[lat,lng],...]"
        float center_lat
        float center_lng
        bool reverse_flow_detected
        bool flow_conflict
    }

    ALERTS {
        string id PK "e.g. ALT-8924"
        string zone_id FK
        string venue_id FK
        enum severity "safe | caution | warning | critical"
        string title
        string category
        string trigger_reason
        string sentinel_analysis
        float confidence_score
        float density
        float flow_rate
        json recommended_actions
        enum status "OPEN | DISPATCHED | RESOLVED"
        string resolved_by
        datetime created_at
        datetime resolved_at
    }

    CITIZEN_REPORTS {
        uuid id PK
        enum category "Overcrowding | Medical | Hazard | Panic"
        string description
        string location_name
        string venue_id
        float latitude
        float longitude
        string media_url
        string media_type
        int upvotes
        enum status "PENDING | VERIFIED | DISPATCHED | RESOLVED"
        datetime created_at
    }

    TELEMETRY_LOGS {
        bigint id PK
        string zone_id FK
        datetime timestamp "indexed"
        int person_count
        float density
        float avg_speed
        bool flow_conflict
        bool reverse_flow_detected
        float surge_score
        float calculated_risk_score
    }

    CCTV_FEEDS {
        string id PK
        string name
        string location
        string zone_id FK
        enum status "online | warning | offline"
        int fps
        int person_count
        string image_url
        string edge_node_id
        json yolo_detections_json
    }

    AUDIT_LOGS {
        int id PK
        string operator_id
        string action_taken
        string target_entity
        datetime timestamp
    }

    VENUES ||--o{ ZONES : "contains"
    ZONES ||--o{ ALERTS : "triggers"
    ZONES ||--o{ CCTV_FEEDS : "monitored by"
    ZONES ||--o{ TELEMETRY_LOGS : "records"
    VENUES ||--o{ ALERTS : "scoped to"
    VENUES ||--o{ CITIZEN_REPORTS : "reported at"
```

### Pre-Seeded Venues

| Venue ID | Name | Location | Zones |
|---|---|---|---|
| `soa-iter-01` | SOA ITER Campus | Bhubaneswar, Odisha | `gate_1`, `zone_admin_block_rd`, `zone_library_roundabout`, `zone_sports_complex_rd`, `gate_2`, `zone_e_block_lawn_rd` |
| `kalinga-stadium-01` | Kalinga International Stadium | Nayapalli, Bhubaneswar | `ks_gate_3`, `ks_sky_walk`, `ks_swimming`, `ks_athletics`, `ks_parking`, `ks_badminton` |

---

## 5. ML & AI Pipeline

### 5.1 Intelligence Stack Overview

```mermaid
graph TB
    subgraph EDGE_INFERENCE["Edge Inference"]
        CCTV["CCTV Stream<br/><i>MJPEG / RTSP</i>"]
        YOLO["YOLOv8<br/><i>Person Detection</i>"]
        BBOX["Bounding Boxes<br/><i>class=person, conf > 0.5</i>"]
    end

    subgraph TELEMETRY_INGEST["Telemetry Ingestion"]
        AGG["Multi-Camera Aggregator<br/><i>Overlap deduplication</i>"]
        POST_API["POST /api/v1/telemetry"]
    end

    subgraph RISK_SCORING["Risk Scoring"]
        XGB["XGBoost Regressor<br/><i>crowdshield_xgb_model.json</i>"]
        OVERRIDES["Safety Overrides<br/><i>Non-negotiable rules</i>"]
        RISK_OUT["Risk Score (0–100)<br/><i>→ risk_level classification</i>"]
    end

    subgraph FORECASTING["Predictive Forecasting"]
        HISTORY["Telemetry History<br/><i>1-min resampled windows</i>"]
        RIDGE["Ridge AR(3)<br/><i>3-lag autoregression</i>"]
        FORECAST["10-Minute Curve<br/><i>t+2, t+5, t+8, t+10</i>"]
        WARNING["Early Warning Flag<br/><i>current < 3.0 but t+10 ≥ 4.0</i>"]
    end

    subgraph EVACUATION["Evacuation Routing"]
        GRAPH["venue_graph.json<br/><i>NetworkX DiGraph</i>"]
        ASTAR["A* Pathfinder<br/><i>Euclidean heuristic</i>"]
        ROUTE["Safest Exit Path<br/><i>Avoids critical zones</i>"]
    end

    subgraph AI_SERVICES["External AI"]
        GEMINI["Google Gemini<br/><i>gemini-3.5-flash</i><br/>NDRF summaries"]
        SARVAM["Sarvam AI<br/><i>Bulbul v3 TTS</i><br/>5 Indian languages"]
    end

    CCTV --> YOLO --> BBOX --> AGG
    AGG --> POST_API --> XGB
    XGB --> OVERRIDES --> RISK_OUT
    RISK_OUT --> HISTORY --> RIDGE --> FORECAST --> WARNING
    RISK_OUT -->|"Update edge weights"| ASTAR
    GRAPH --> ASTAR --> ROUTE

    style EDGE_INFERENCE fill:#fafafa,stroke:#6B7062
    style TELEMETRY_INGEST fill:#fff8f0,stroke:#C9501C
    style RISK_SCORING fill:#f0fff4,stroke:#3F7D5C,stroke-width:2px
    style FORECASTING fill:#f0f4ff,stroke:#2B5FA6
    style EVACUATION fill:#fdf5f0,stroke:#B3242E
    style AI_SERVICES fill:#f5f0ff,stroke:#6B7062
```

### 5.2 XGBoost Risk Engine

**Input Features:**

| Feature | Source | Description |
|---|---|---|
| `density` | Camera headcount / zone area | Persons per m² |
| `avg_speed` | Optical flow estimation | Average pedestrian speed |
| `flow_conflict` | Directional analysis | Counter-flows detected (bool) |
| `reverse_flow_detected` | Optical flow | Crowd moving against expected direction |
| `capacity_ratio` | headcount / max_capacity | Zone fill percentage |
| `surge_score` | Δ headcount / Δ time | Rate of crowd inflow |

**Deterministic Safety Overrides (non-negotiable):**

| Condition | Override | Rationale |
|---|---|---|
| Reverse flow AND density > 3.0 p/m² | Risk score += 20.0 | Stampede precursor pattern |
| Capacity ratio > 0.85 AND surge > 0.7 | Minimum risk = 75.0 (Warning) | Overcapacity with rapid inflow |
| Density > 4.25 p/m² | Minimum risk = 90.0 (Critical) | Lethal crush threshold |

### 5.3 Risk Classification

| Density (p/m²) | Risk Level | Color | Response |
|---|---|---|---|
| < 2.0 | **Safe** | 🟢 `#3F7D5C` | Normal operations |
| 2.0 – 3.0 | **Caution** | 🟡 `#D9A02D` | Increased monitoring |
| 3.0 – 4.0 | **Warning** | 🟠 `#C9501C` | Flow control + gate restrictions |
| > 4.0 | **Critical** | 🔴 `#B3242E` | Emergency evacuation |

### 5.4 A* Pathfinding Cost Function

Edge traversal cost is dynamically weighted by live crowd density:

$$\text{Cost}(u, v) = d_{\text{physical}} \times \exp\!\bigl(\min(\rho \times 0.4,\; 10.0)\bigr) \times R$$

Where:
- $d_{\text{physical}}$ = Euclidean distance between nodes
- $\rho$ = Current density (p/m²) of the target zone
- $R$ = Risk multiplier: **Critical** = $8.0\times$, **Warning/Caution** = $2.5\times$, **Safe** = $1.0\times$

### 5.5 Multi-Camera Overlap Deduplication

$$\text{True Headcount} = \sum_{i} C_i - \sum_{(A,B) \in \text{overlaps}} \alpha_{AB} \times \min(C_A, C_B)$$

Where $\alpha_{AB}$ is the pre-calibrated overlap ratio between adjacent camera zones defined in `venue_graph.json`.

---

## 6. Real-Time Communication

### 6.1 WebSocket Architecture

```mermaid
sequenceDiagram
    participant CLIENT as 🖥️ React Client
    participant WS_SVC as wsService (Singleton)
    participant WS_EP as /api/v1/ws/telemetry
    participant CONN_MGR as ConnectionManager
    participant ENDPOINTS as API Endpoints

    CLIENT->>WS_SVC: wsService.connect(token)
    WS_SVC->>WS_EP: WebSocket upgrade + ?token=JWT
    WS_EP->>WS_EP: Verify JWT → extract user, role

    WS_EP->>CLIENT: INITIAL_STATE (all zones snapshot)

    loop Telemetry Ingestion
        ENDPOINTS->>CONN_MGR: broadcast(TELEMETRY_UPDATE, zoneData)
        CONN_MGR->>CLIENT: Push to all connected clients
    end

    Note over WS_SVC: Auto-reconnect on disconnect<br/>Exponential backoff (max 8s)

    alt Connection Lost
        WS_SVC->>WS_SVC: Wait backoff interval
        WS_SVC->>WS_EP: Reconnect attempt
    end
```

### 6.2 Event Types

| Event | Direction | Payload | Trigger |
|---|---|---|---|
| `INITIAL_STATE` | Server → Client | Full zone array | On WebSocket connect |
| `TELEMETRY_UPDATE` | Server → Client | Zone metrics + risk + forecast + route | POST /telemetry processed |
| `NEW_ALERT` | Server → Client | Alert object | Risk threshold breached |
| `SCENARIO_TRIGGERED` | Server → Client | Scenario metadata | Admin triggers stampede drill |
| `SCENARIO_RESET` | Server → Client | Reset confirmation | Admin resets scenario |
| `INTERVENTION_DISPATCHED` | Server → Client | Action details | PA / SMS / gate action executed |
| `RESOLVED_BY_VOLUNTEER` | Server → Client | Alert + volunteer info | Volunteer marks alert resolved |
| `CITIZEN_HAZARD_SUBMITTED` | Server → Client | Citizen report | SOS report submitted |
| `HAZARD_STATUS_UPDATED` | Server → Client | Updated report | Admin validates report |
| `VENUE_SWITCHED` | Server → Client | New venue ID | Active venue changed |
| `SOCIAL_MEDIA_DISPATCHED` | Server → Client | Platform + message | Social alert sent |

### 6.3 Hybrid Strategy: Polling + Push

| Method | Channel | Frequency | Use Case |
|---|---|---|---|
| **WebSocket Push** | `ws://` | Instant | Critical alerts, telemetry, broadcasts |
| **Stale Detection** | Frontend timer | Every 10s | Flag stale feeds if no WS update received |
| **On-Demand REST** | `http://` | User-triggered | Evacuation routes, TTS, analytics export |

---

## 7. API Specification

### 7.1 Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | None | Unified JWT login (Admin / Citizen / Volunteer) |
| `POST` | `/api/v1/auth/register` | None | Citizen self-registration |

### 7.2 Venue & Zone Management

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/venues/` | JWT | List all venues with nested zones |
| `GET` | `/api/v1/venues/{venue_id}` | JWT | Single venue with zones |
| `GET` | `/api/v1/venues/active` | JWT | Get currently active venue |
| `POST` | `/api/v1/venues/active` | Admin | Set active venue (broadcasts `VENUE_SWITCHED`) |
| `GET` | `/api/v1/zones/` | JWT | Zone list (filterable by `?venue_id=`) |
| `GET` | `/api/v1/zones/{zone_id}` | JWT | Single zone status |

### 7.3 Telemetry & Intelligence

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/telemetry/` | JWT | Ingest edge telemetry → XGBoost → alerts → WS broadcast |

### 7.4 Alerts & Incidents

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/alerts/` | Admin | Active alert feed |
| `PATCH` | `/api/v1/alerts/{alert_id}/status` | JWT | Volunteer resolution loop |
| `POST` | `/api/v1/incidents/` | Citizen+ | Submit citizen SOS report |
| `GET` | `/api/v1/incidents/` | JWT | Fetch reports (newest first) |
| `PATCH` | `/api/v1/incidents/{id}/status` | Admin | Verify / resolve incident |
| `PATCH` | `/api/v1/incidents/{id}/upvote` | Citizen+ | Community upvote |

### 7.5 Emergency Broadcast

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/broadcast/` | Admin | Sarvam AI multilingual PA via WS |
| `POST` | `/api/v1/broadcast/sms` | Admin | Simulated cellular SMS broadcast |
| `POST` | `/api/v1/broadcast/sarvam-tts` | JWT | Text-to-Speech (Sarvam Bulbul v3) |
| `POST` | `/api/v1/broadcast/social` | Admin | Social media emergency dispatch |

### 7.6 Interventions & Scenarios

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/interventions/dispatch` | Admin | Dispatch countermeasure + resolve alerts |
| `POST` | `/api/v1/interventions/scenario` | Admin | Trigger / reset stampede simulation |
| `GET` | `/api/v1/interventions/scenario/status` | JWT | Check active scenario state |

### 7.7 Routing & Digital Twin

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/routing/evacuate` | JWT | A* evacuation path to nearest safe exit |
| `POST` | `/api/v1/routing/query` | JWT | Flexible 3D twin graph query |

### 7.8 Analytics & Forecasting

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/analytics/history` | Admin | 24h aggregated footfall + bottleneck data |
| `POST` | `/api/v1/analytics/generate-summary/{id}` | Admin | Gemini NDRF post-incident summary |
| `GET` | `/api/v1/analytics/audit-logs` | Admin | NDRF compliance audit trail |
| `GET` | `/api/v1/analytics/predictive-forecast/{zone_id}` | Admin | 10-minute density prediction curve |

---

## 8. Authentication & RBAC

```mermaid
graph TB
    subgraph AUTH_FLOW["Authentication Flow"]
        LOGIN["POST /auth/login<br/><i>email + password</i>"]
        REGISTER["POST /auth/register<br/><i>Citizen self-signup</i>"]
        HASH["bcrypt hash<br/><i>passlib</i>"]
        JWT_GEN["JWT Generation<br/><i>HS256, 60 min expiry</i>"]
    end

    subgraph TOKEN["JWT Token Payload"]
        SUB["sub: user_id"]
        ROLE_CLAIM["role: ADMIN | CITIZEN | VOLUNTEER"]
        EXP["exp: timestamp"]
    end

    subgraph GUARDS["FastAPI Dependency Guards"]
        G_ANY["get_current_user<br/><i>Any authenticated user</i>"]
        G_ADMIN["get_current_active_admin<br/><i>ADMIN only</i>"]
        G_CITIZEN["get_current_active_citizen<br/><i>CITIZEN + VOLUNTEER + ADMIN</i>"]
    end

    subgraph FRONTEND_AUTH["Frontend Auth"]
        CTX["AuthContext.tsx<br/><i>useAuth() hook</i>"]
        STORAGE["localStorage<br/><i>token + view_mode</i>"]
        INTERCEPTOR["Axios Interceptor<br/><i>Bearer header + 401 handler</i>"]
    end

    LOGIN --> HASH --> JWT_GEN --> TOKEN
    REGISTER --> HASH
    TOKEN --> GUARDS
    TOKEN --> FRONTEND_AUTH
    CTX --> INTERCEPTOR

    style AUTH_FLOW fill:#fff8f0,stroke:#D9A02D
    style TOKEN fill:#f0f4ff,stroke:#2B5FA6
    style GUARDS fill:#f0fff4,stroke:#3F7D5C
    style FRONTEND_AUTH fill:#fdf5f0,stroke:#C9501C
```

### Role Permissions Matrix

| Capability | Admin | Volunteer | Citizen |
|---|---|---|---|
| View dashboard & analytics | ✅ | ❌ | ❌ |
| Trigger scenario drills | ✅ | ❌ | ❌ |
| Dispatch emergency broadcast | ✅ | ❌ | ❌ |
| Resolve alerts | ✅ | ✅ | ❌ |
| Submit SOS reports | ✅ | ✅ | ✅ |
| View safety feed | ✅ | ✅ | ✅ |
| Upvote citizen reports | ✅ | ✅ | ✅ |
| Access evacuation guide | ✅ | ✅ | ✅ |

---

## 9. Data Flow — End to End

```mermaid
sequenceDiagram
    participant CAM as 📷 CCTV Camera
    participant YOLO as 🧠 YOLOv8
    participant AGG as 📊 Aggregator
    participant API as 🔀 POST /telemetry
    participant XGB as ⚡ XGBoost Engine
    participant OVER as 🛡️ Safety Overrides
    participant RIDGE as 📈 Ridge Forecaster
    participant ASTAR as 🗺️ A* Pathfinder
    participant DB as 🗄️ PostgreSQL
    participant WS as ⚡ WebSocket
    participant UI as 🖥️ React UI

    CAM->>YOLO: MJPEG frame
    YOLO->>YOLO: Detect persons (conf > 0.5)
    YOLO->>AGG: Zone headcounts
    AGG->>AGG: Overlap dedup (α coefficients)
    AGG->>API: Aggregated telemetry payload

    API->>XGB: Feature vector (6 features)
    XGB->>XGB: Predict risk score (0–100)
    XGB->>OVER: Raw score
    OVER->>OVER: Apply safety floor rules

    Note over OVER: density > 4.25 → min 90<br/>reverse + dense → +20<br/>cap > 0.85 + surge → min 75

    OVER->>DB: UPDATE zone (density, risk, headcount)
    OVER->>DB: INSERT telemetry_log

    alt Risk threshold breached
        OVER->>DB: INSERT alert (OPEN)
        OVER->>WS: Emit NEW_ALERT
    end

    API->>RIDGE: Query recent telemetry
    RIDGE->>RIDGE: Fit AR(3), project 10 min
    RIDGE->>API: Forecast curve + early warning

    API->>ASTAR: Update edge weights (live density)
    ASTAR->>ASTAR: Compute path to nearest safe exit
    ASTAR->>API: Evacuation route

    API->>WS: Emit TELEMETRY_UPDATE
    WS->>UI: Push zone + forecast + route
    UI->>UI: Re-render views
```

---

## 10. Deployment Topology

```mermaid
graph TB
    subgraph BROWSER["🌐 Browser"]
        SPA["React SPA<br/><i>Vite Dev :5173</i><br/><i>or static build</i>"]
        SW["Service Worker<br/><i>Offline app shell</i>"]
    end

    subgraph APP_SERVER["🖧 Application Server"]
        UVICORN["Uvicorn<br/><i>:8000</i>"]
        FASTAPI_APP["FastAPI<br/><i>async + ASGI</i>"]
        WS_MGR["ConnectionManager<br/><i>In-process WS hub</i>"]
    end

    subgraph DATABASE_SVC["☁️ Neon Cloud"]
        NEON_PG[("Neon PostgreSQL<br/><i>SSL + asyncpg</i>")]
    end

    subgraph EDGE_NODES["📷 Edge Inference"]
        NODE1["Edge Node 1<br/><i>YOLOv8 + Camera</i>"]
        NODE2["Edge Node 2<br/><i>YOLOv8 + Camera</i>"]
        NODEN["Edge Node N"]
    end

    subgraph EXTERNAL["☁️ External APIs"]
        SARVAM_API["Sarvam AI<br/><i>sarvam.ai</i><br/>TTS Bulbul v3"]
        GEMINI_API["Google Gemini<br/><i>gemini-3.5-flash</i><br/>NDRF summaries"]
    end

    SPA -->|"HTTP / WS :8000"| UVICORN
    UVICORN --> FASTAPI_APP
    FASTAPI_APP --> WS_MGR
    FASTAPI_APP -->|"asyncpg + SSL"| NEON_PG
    NODE1 -->|"POST /telemetry"| UVICORN
    NODE2 -->|"POST /telemetry"| UVICORN
    NODEN -->|"POST /telemetry"| UVICORN
    FASTAPI_APP -->|"HTTPS"| SARVAM_API
    FASTAPI_APP -->|"HTTPS"| GEMINI_API

    style BROWSER fill:#f0f4ff,stroke:#2B5FA6,stroke-width:2px
    style APP_SERVER fill:#f0fff4,stroke:#3F7D5C,stroke-width:2px
    style DATABASE_SVC fill:#fdf5f0,stroke:#B3242E,stroke-width:2px
    style EDGE_NODES fill:#fff8f0,stroke:#D9A02D
    style EXTERNAL fill:#f5f0ff,stroke:#6B7062
```

### Port & Service Map

| Service | Port | Protocol | Notes |
|---|---|---|---|
| Vite Dev Server | `5173` | HTTP | HMR-enabled dev mode |
| Uvicorn (FastAPI) | `8000` | HTTP + WS | ASGI async server |
| Neon PostgreSQL | `5432` | TCP (SSL) | Cloud-hosted, asyncpg driver |
| Sarvam AI | `443` | HTTPS | External TTS API |
| Google Gemini | `443` | HTTPS | External generative AI |
| CCTV Streams | Varies | MJPEG / RTSP | Per-camera edge feed |

---

## 11. Technology Stack Reference

### Frontend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| UI Framework | React | 19.2 | Component rendering |
| Language | TypeScript | 5.8 | Static type safety |
| Bundler | Vite | 6.2 | Fast HMR + production builds |
| Styling | TailwindCSS | 4.1 | Utility-first CSS |
| Animation | Framer Motion | 13.1 | Micro-interactions + parallax |
| Charts | Recharts | 3.10 | Area charts, density trends |
| Maps | Leaflet + React-Leaflet | 1.9 / 5.0 | GIS zone overlays |
| 3D Engine | Three.js + R3F | 0.185 | Digital twin WebGL canvas |
| Geospatial | Turf.js | 7.4 | Geofence proximity calculations |
| HTTP Client | Axios | 1.19 | REST API + JWT interceptors |
| Icons | Lucide React | 0.546 | Consistent icon system |
| AI SDK | Google GenAI | 2.4 | Client-side Gemini integration |
| Testing | Playwright | 1.62 | E2E browser tests |

### Backend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | FastAPI | 0.115 | Async REST + WebSocket |
| Server | Uvicorn | 0.34 | ASGI production server |
| ORM | SQLAlchemy (async) | 2.0 | Async database operations |
| DB Driver | asyncpg | 0.30 | PostgreSQL async adapter |
| Database | Neon PostgreSQL | Cloud | Managed serverless Postgres |
| ML — Risk | XGBoost | 3.0 | Gradient-boosted risk scoring |
| ML — Forecast | scikit-learn (Ridge) | 1.6 | Autoregressive density prediction |
| Graph | NetworkX | 3.5 | A* pathfinding over venue topology |
| Auth | python-jose + passlib | — | JWT HS256 + bcrypt hashing |
| Config | Pydantic Settings | 2.9 | Typed environment configuration |
| AI — Summaries | Google Gemini SDK | 0.2 | NDRF post-incident reports |
| AI — TTS | Sarvam AI (Bulbul v3) | — | 5-language Indian voice synthesis |

### Multilingual Support

| Language | Code | Script | Used In |
|---|---|---|---|
| English | `en` | Latin | Dashboard + Citizen UI |
| Hindi | `hi` | Devanagari (हिन्दी) | PA + Citizen + TTS |
| Odia | `od` | Odia (ଓଡ଼ିଆ) | PA + Citizen + TTS |
| Bengali | `bn` | Bengali (বাংলা) | PA + Citizen + TTS |
| Tamil | `ta` | Tamil (தமிழ்) | PA + Citizen + TTS |

### Design System — Cartographic Theme

| Token | Hex | Role |
|---|---|---|
| Background | `#F8F7F4` | Warm stone-paper canvas |
| Surface | `#FFFFFF` | Card surfaces |
| Primary Text | `#22271F` | Warm charcoal ink |
| Secondary Text | `#6B7062` | Muted olive-gray |
| Border | `#DEDBD1` | Warm light stone hairlines |
| Accent | `#2B5FA6` | Compass blue — buttons, links, active states |
| Risk Safe | `#3F7D5C` | Moss-teal green |
| Risk Caution | `#D9A02D` | Ochre-gold |
| Risk Warning | `#C9501C` | Instrument orange |
| Risk Critical | `#B3242E` | Survey-map red |

### Typography

| Role | Typeface | Weights | Usage |
|---|---|---|---|
| Display / Headings | Space Grotesk | 500, 600, 700 | Page titles, section headers |
| Body / UI | Sora | 400, 500, 600 | Body text, buttons, labels |
| Data / Telemetry | JetBrains Mono | 400, 500, 600, 700 | Metrics, timestamps, codes |

---

> **CrowdShield** — Early Warning Crowd Stampede Prevention System
> Built for India's largest public gatherings. Powered by YOLOv8 edge AI, XGBoost risk intelligence, and Sarvam Bhashini multilingual voice alerts.
