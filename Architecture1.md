# CrowdShield — System Architecture

> **AI-Powered Crowd Intelligence & Stampede Prevention Platform**
> Real-time crowd density monitoring, predictive risk forecasting, and multi-lingual emergency response — purpose-built for India's largest public venues.

---

## Table of Contents

1. [High-Level System Overview](#1-high-level-system-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [ML & AI Pipeline](#4-ml--ai-pipeline)
5. [Real-Time Communication](#5-real-time-communication)
6. [Authentication & RBAC](#6-authentication--rbac)
7. [Deployment Topology](#8-deployment-topology)


---

## 1. High-Level System Overview

```mermaid
graph TB
    subgraph CLIENT["🖥️ Client Layer"]
        direction TB
        ADMIN["Admin Command Deck<br/><i>React 19 + TypeScript</i>"]
        CITIZEN["Citizen Safety Portal<br/><i>React 19 + TypeScript</i>"]
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
        YOLO["YOLOv11 Inference<br/><i>On-device / edge node</i>"]
    end

    ADMIN -->|"HTTP + WS"| GATEWAY
    CITIZEN -->|"HTTP + WS"| GATEWAY

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

### 2.1 Component Architecture

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

### 2.2 Real-Time Data Ingestion

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
            D_CITIZEN["get_current_active_citizen<br/><i>CITIZEN + ADMIN</i>"]
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

## 4. ML & AI Pipeline

```mermaid
graph TB
    subgraph EDGE_INFERENCE["Edge Inference"]
        CCTV["CCTV Stream<br/><i>MJPEG / RTSP</i>"]
        YOLO["YOLOv11<br/><i>Person Detection</i>"]
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
---

## 5. Real-Time Communication

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
---

## 6. Authentication & RBAC

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
        ROLE_CLAIM["role: ADMIN | CITIZEN "]
        EXP["exp: timestamp"]
    end

    subgraph GUARDS["FastAPI Dependency Guards"]
        G_ANY["get_current_user<br/><i>Any authenticated user</i>"]
        G_ADMIN["get_current_active_admin<br/><i>ADMIN only</i>"]
        G_CITIZEN["get_current_active_citizen<br/><i>CITIZEN + ADMIN</i>"]
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

| Capability | Admin | Citizen |
|---|---|---|
| View dashboard & analytics | ✅ | ❌ |
| Trigger scenario drills | ✅ | ❌ |
| Dispatch emergency broadcast | ✅ | ❌ |
| Resolve alerts | ✅ | ❌ |
| Submit SOS reports | ✅ | ✅ |
| View safety feed | ✅ | ✅ |
| Upvote citizen reports | ✅ | ✅ |
| Access evacuation guide | ✅ | ✅ |

---

## 7. Deployment Topology

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
        NODE1["Edge Node 1<br/><i>YOLOv11 + Camera</i>"]
        NODE2["Edge Node 2<br/><i>YOLOv11 + Camera</i>"]
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

> **CrowdShield** — Early Warning Crowd Stampede Prevention System
> Built for India's largest public gatherings. Powered by YOLOv11 edge AI, XGBoost risk intelligence, and Sarvam Bhashini multilingual voice alerts.
