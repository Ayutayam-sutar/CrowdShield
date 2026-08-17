<div align="center">

# CrowdShield — Flowcharts

### AI-Powered Early Warning Crowd Stampede Prevention System

</div>

---

## Table of Contents

1. [Three-Layer Pipeline — See · Think · Act](#2-three-layer-pipeline--see--think--act)
2. [Telemetry Ingestion Pipeline](#4-telemetry-ingestion-pipeline)
3. [XGBoost Risk Scoring Engine — Decision Flowchart](#5-xgboost-risk-scoring-engine--decision-flowchart)
4. [Alert Lifecycle — State Machine](#6-alert-lifecycle--state-machine)
5. [Citizen SOS Workflow](#7-citizen-sos-workflow)
6. [A* Evacuation Routing Flowchart](#8-a-evacuation-routing-flowchart)
7. [Authentication & RBAC Flow](#9-authentication--rbac-flow)

---

## 1. Three-Layer Pipeline — See · Think · Act

CrowdShield's core philosophy follows a **See → Think → Act** pipeline that mirrors human decision-making but operates at machine speed.

```mermaid
graph LR
    subgraph SEE["🔭 SEE — Edge Vision"]
        direction TB
        S1["CCTV Feeds<br/><i>MJPEG / RTSP</i>"]
        S2["YOLOv11 Detection<br/><i>Person class, conf > 0.5</i>"]
        S3["ByteTrack MOT<br/><i>Multi-object tracking</i>"]
        S4["Optical Flow<br/><i>Speed + direction vectors</i>"]
        S5["Zone Headcount<br/><i>Per-camera count</i>"]
        S1 --> S2 --> S3 --> S4 --> S5
    end

    subgraph THINK["🧠 THINK — Intelligence"]
        direction TB
        T1["Overlap Deduplication<br/><i>α-coefficient correction</i>"]
        T2["Feature Engineering<br/><i>6 features extracted</i>"]
        T3["XGBoost Risk Score<br/><i>0–100 scale</i>"]
        T4["Safety Overrides<br/><i>Physics-grounded rules</i>"]
        T5["Ridge AR(3) Forecast<br/><i>10-min density projection</i>"]
        T1 --> T2 --> T3 --> T4 --> T5
    end

    subgraph ACT["⚡ ACT — Response"]
        direction TB
        A1["Alert Generation<br/><i>Severity classification</i>"]
        A2["A* Evacuation Routing<br/><i>Density-penalized paths</i>"]
        A3["Multilingual PA Broadcast<br/><i>5 Indian languages via Sarvam</i>"]
        A4["Volunteer Task Dispatch<br/><i>On-site crowd control</i>"]
        A5["Gemini Incident Report<br/><i>NDRF-format summary</i>"]
        A1 --> A2 --> A3 --> A4 --> A5
    end

    SEE -->|"Telemetry<br/>Payload"| THINK
    THINK -->|"Risk + Forecast<br/>+ Route"| ACT

    style SEE fill:#0d1b2a,stroke:#e0e1dd,stroke-width:2px,color:#e0e1dd
    style THINK fill:#1b263b,stroke:#778da9,stroke-width:2px,color:#e0e1dd
    style ACT fill:#415a77,stroke:#e0e1dd,stroke-width:2px,color:#e0e1dd
```
---

## 2. Telemetry Ingestion Pipeline

Detailed view of how raw camera data is transformed into actionable intelligence.

```mermaid
flowchart TD
    START(["📷 CCTV Frame Received"]) --> YOLO_DETECT["YOLOv11 Inference<br/>Detect all persons in frame"]
    YOLO_DETECT --> FILTER{"Confidence<br/>> 0.5?"}
    FILTER -->|No| DISCARD["Discard detection"]
    FILTER -->|Yes| BBOX["Extract bounding boxes<br/>+ center coordinates"]
    BBOX --> TRACK["ByteTrack MOT<br/>Assign persistent IDs"]
    TRACK --> OPTICAL["OpenCV Optical Flow<br/>Estimate speed + direction"]
    OPTICAL --> COUNT["Per-Camera Zone Count<br/>headcount + avg_speed"]

    COUNT --> MULTI{"Multiple cameras<br/>on same zone?"}
    MULTI -->|No| DIRECT["Use raw count directly"]
    MULTI -->|Yes| DEDUP["Overlap Deduplication<br/>True = ΣCi - Σ(αAB × min(CA, CB))"]

    DIRECT --> FEATURE["Feature Engineering"]
    DEDUP --> FEATURE

    FEATURE --> F1["density = headcount / zone_area"]
    FEATURE --> F2["avg_speed = optical flow mean"]
    FEATURE --> F3["flow_conflict = counter-flow detected"]
    FEATURE --> F4["reverse_flow = against expected direction"]
    FEATURE --> F5["capacity_ratio = headcount / max_capacity"]
    FEATURE --> F6["surge_score = Δheadcount / Δtime"]

    F1 --> VECTOR["6-Feature Vector"]
    F2 --> VECTOR
    F3 --> VECTOR
    F4 --> VECTOR
    F5 --> VECTOR
    F6 --> VECTOR

    VECTOR --> POST["POST /api/v1/telemetry<br/>Submit to backend"]

    style START fill:#e94560,stroke:#1a1a2e,color:#fff
    style DISCARD fill:#6b7062,stroke:#1a1a2e,color:#fff
    style VECTOR fill:#53a8b6,stroke:#1a1a2e,color:#fff
    style POST fill:#0f3460,stroke:#53a8b6,color:#fff
```

---

## 3. XGBoost Risk Scoring Engine — Decision Flowchart

This flowchart shows the complete risk scoring pipeline, including the deterministic safety overrides that enforce non-negotiable escalation rules.

```mermaid
flowchart TD
    INPUT(["📥 6-Feature Vector Received"]) --> XGBOOST["XGBoost Regressor<br/>crowdshield_xgb_model.json<br/>Predict raw_score (0–100)"]

    XGBOOST --> CHECK_LETHAL{"density > 4.25<br/>persons/m²?"}

    CHECK_LETHAL -->|Yes| OVERRIDE_CRITICAL["🔴 OVERRIDE: score = max(raw, 90.0)<br/>CRITICAL — Lethal crush threshold"]
    CHECK_LETHAL -->|No| CHECK_REVERSE{"reverse_flow AND<br/>density > 3.0?"}

    CHECK_REVERSE -->|Yes| OVERRIDE_REVERSE["🟠 OVERRIDE: score += 20.0<br/>Stampede precursor pattern"]
    CHECK_REVERSE -->|No| CHECK_CAPACITY{"capacity_ratio > 0.85<br/>AND surge > 0.7?"}

    OVERRIDE_REVERSE --> CHECK_CAPACITY

    CHECK_CAPACITY -->|Yes| OVERRIDE_CAPACITY["🟠 OVERRIDE: score = max(score, 75.0)<br/>Overcapacity + rapid inflow"]
    CHECK_CAPACITY -->|No| CLAMP["Clamp score to 0–100 range"]

    OVERRIDE_CRITICAL --> CLAMP
    OVERRIDE_CAPACITY --> CLAMP

    CLAMP --> CLASSIFY{"Classify Risk Level"}

    CLASSIFY --> SAFE["🟢 SAFE<br/>score < 30<br/>density < 2.0 p/m²"]
    CLASSIFY --> CAUTION["🟡 CAUTION<br/>30 ≤ score < 60<br/>density 2.0–3.0 p/m²"]
    CLASSIFY --> WARNING["🟠 WARNING<br/>60 ≤ score < 80<br/>density 3.0–4.0 p/m²"]
    CLASSIFY --> CRITICAL["🔴 CRITICAL<br/>score ≥ 80<br/>density > 4.0 p/m²"]

    SAFE --> DB_UPDATE["Update zone in PostgreSQL"]
    CAUTION --> DB_UPDATE
    WARNING --> ALERT_GEN["Generate Alert<br/>+ Trigger Response"]
    CRITICAL --> ALERT_GEN

    ALERT_GEN --> DB_UPDATE
    ALERT_GEN --> BROADCAST["Emergency Broadcast<br/>+ Evacuation Route"]

    DB_UPDATE --> LOG["INSERT telemetry_log"]
    LOG --> WS_EMIT["Emit TELEMETRY_UPDATE<br/>via WebSocket"]

    style INPUT fill:#53a8b6,stroke:#1a1a2e,color:#fff
    style OVERRIDE_CRITICAL fill:#b3242e,stroke:#1a1a2e,color:#fff
    style OVERRIDE_REVERSE fill:#c9501c,stroke:#1a1a2e,color:#fff
    style OVERRIDE_CAPACITY fill:#c9501c,stroke:#1a1a2e,color:#fff
    style SAFE fill:#3f7d5c,stroke:#1a1a2e,color:#fff
    style CAUTION fill:#d9a02d,stroke:#1a1a2e,color:#fff
    style WARNING fill:#c9501c,stroke:#1a1a2e,color:#fff
    style CRITICAL fill:#b3242e,stroke:#1a1a2e,color:#fff
    style BROADCAST fill:#e94560,stroke:#1a1a2e,color:#fff
```

---

## 4. Alert Lifecycle — State Machine

Every alert follows a strict state machine from creation to resolution.

```mermaid
stateDiagram-v2
    [*] --> OPEN: Risk threshold breached<br/>(score ≥ 60)
    
    OPEN --> DISPATCHED: Admin dispatches<br/>intervention
    OPEN --> RESOLVED: Auto-resolved<br/>(risk drops below threshold)
    
    
    DISPATCHED --> DISPATCHED: Escalate severity<br/>(conditions worsen)
    
    RESOLVED --> [*]: Alert archived<br/>+ audit logged

    state OPEN {
        [*] --> SentinelAnalysis: Gemini generates<br/>situational analysis
        SentinelAnalysis --> AlertEmitted: NEW_ALERT event<br/>broadcast via WS
        AlertEmitted --> AwaitingAction: Displayed on<br/>Admin Alert Feed
    }

    state DISPATCHED {
        [*] --> BroadcastSent: Task dispatched<br/>PA broadcast 
        BroadcastSent --> EvacRouteComputed: A* path to<br/>nearest safe exit
        EvacRouteComputed --> MonitoringResponse: Live tracking<br/>of zone density
    }
```

---

## 5. Citizen SOS Workflow

Flowchart showing how citizen-reported incidents are processed from mobile SOS to volunteer dispatch.

```mermaid
flowchart TD
    START(["🆘 Citizen Taps SOS Button"]) --> SELECT_CAT["Select Category<br/>Overcrowding | Medical | Hazard | Panic"]
    SELECT_CAT --> DESCRIBE["Enter Description<br/>+ Optional Photo/Video"]
    DESCRIBE --> GPS["Capture GPS Location<br/>via Browser Geolocation API"]
    GPS --> SUBMIT["POST /api/v1/incidents<br/>Submit citizen report"]

    SUBMIT --> DB_INSERT["INSERT citizen_report<br/>status = PENDING"]
    DB_INSERT --> WS_NOTIFY["Emit CITIZEN_REPORT<br/>via WebSocket"]
    WS_NOTIFY --> ADMIN_FEED["Appears on Admin<br/>Alert Feed"]
    WS_NOTIFY --> CITIZEN_FEED["Appears on Citizen<br/>Safety Feed"]

    CITIZEN_FEED --> UPVOTE{"Other citizens<br/>upvote report?"}
    UPVOTE -->|"Yes (≥ 3 upvotes)"| VERIFY["Status → VERIFIED<br/>Priority escalated"]
    UPVOTE -->|"No"| WAIT["Awaits admin review"]

    ADMIN_FEED --> ADMIN_REVIEW{"Admin reviews<br/>report"}
    VERIFY --> ADMIN_REVIEW
    WAIT --> ADMIN_REVIEW

    ADMIN_REVIEW -->|"Confirm"| DISPATCH["Status → DISPATCHED<br/>"]
    ADMIN_REVIEW -->|"Dismiss"| RESOLVE_FALSE["Status → RESOLVED<br/>Marked as false positive"]

    DISPATCH -->RESOLVE["Status → RESOLVED<br/>Resolution logged"]
    RESOLVE --> AUDIT["INSERT audit_log<br/>with operator + action"]

    style START fill:#e94560,stroke:#1a1a2e,color:#fff
    style DISPATCH fill:#0f3460,stroke:#53a8b6,color:#fff
    style RESOLVE fill:#3f7d5c,stroke:#1a1a2e,color:#fff
```

---

## 6. A* Evacuation Routing Flowchart

Shows how the dynamic evacuation routing system computes the safest exit path using live density data.

```mermaid
flowchart TD
    TRIGGER(["🚨 Evacuation Triggered<br/>(Critical alert OR manual)"]) --> LOAD_GRAPH["Load venue_graph.json<br/>NetworkX DiGraph"]

    LOAD_GRAPH --> DENSITY["Fetch live density<br/>for all zones from DB"]

    DENSITY --> WEIGHT["Compute dynamic edge costs<br/>Cost(u,v) = dist × exp(min(ρ×0.4, 10)) × R"]

    WEIGHT --> NOTE1["Risk Multipliers:<br/>🔴 Critical = 8.0×<br/>🟠 Warning/Caution = 2.5×<br/>🟢 Safe = 1.0×"]

    WEIGHT --> IDENTIFY_EXITS["Identify all exit nodes<br/>in venue graph"]

    IDENTIFY_EXITS --> SOURCE["Determine source node<br/>(affected zone centroid)"]

    SOURCE --> ASTAR_EXEC["Execute A* Pathfinding<br/>Heuristic = Euclidean distance"]

    ASTAR_EXEC --> MULTI_EXIT{"Multiple<br/>exits available?"}

    MULTI_EXIT -->|Yes| COMPARE["Compare path costs<br/>to all reachable exits"]
    MULTI_EXIT -->|No| SINGLE["Use only available exit"]

    COMPARE --> SELECT["Select shortest-safest path<br/>(lowest total cost)"]
    SINGLE --> SELECT

    SELECT --> BLOCKED{"Any path nodes<br/>in Critical zone?"}
    BLOCKED -->|Yes| REROUTE["Re-run A* excluding<br/>Critical zone nodes"]
    BLOCKED -->|No| OUTPUT["Output evacuation route"]

    REROUTE --> OUTPUT

    OUTPUT --> RESPONSE["Return to API:<br/>• Node sequence<br/>• Total distance<br/>• Total cost<br/>• Zone-by-zone instructions"]

    RESPONSE --> WS_PUSH["Push route to<br/>connected clients via WS"]
    RESPONSE --> CITIZEN_NAV["Citizen app renders<br/>turn-by-turn guidance"]
    RESPONSE --> TWIN["Digital twin overlays<br/>evacuation path"]

    style TRIGGER fill:#e94560,stroke:#1a1a2e,color:#fff
    style ASTAR_EXEC fill:#0f3460,stroke:#53a8b6,color:#fff
    style OUTPUT fill:#3f7d5c,stroke:#1a1a2e,color:#fff
    style REROUTE fill:#c9501c,stroke:#1a1a2e,color:#fff
```

---

## 7. Authentication & RBAC Flow

```mermaid
flowchart TD
    USER(["👤 User Opens App"]) --> HAS_TOKEN{"JWT in<br/>localStorage?"}

    HAS_TOKEN -->|No| AUTH_VIEW["Show AuthView<br/>(Login / Register)"]
    HAS_TOKEN -->|Yes| VALIDATE["Validate JWT<br/>(expiry + signature)"]

    VALIDATE -->|Invalid/Expired| AUTH_VIEW
    VALIDATE -->|Valid| DECODE["Decode JWT payload<br/>sub: user_id, role: ADMIN|CITIZEN"]

    AUTH_VIEW --> LOGIN["POST /api/v1/auth/login<br/>email + password"]
    AUTH_VIEW --> REGISTER["POST /api/v1/auth/register<br/>Citizen self-signup"]

    LOGIN --> BCRYPT["bcrypt.verify(password, hash)"]
    REGISTER --> HASH["bcrypt.hash(password)"]
    HASH --> INSERT_USER["INSERT user<br/>role = CITIZEN"]
    INSERT_USER --> BCRYPT

    BCRYPT -->|Match| GEN_JWT["Generate JWT<br/>HS256, 60-min expiry"]
    BCRYPT -->|No Match| REJECT["401 Unauthorized"]

    GEN_JWT --> STORE["Store in localStorage<br/>+ Set Axios interceptor"]
    STORE --> DECODE

    DECODE --> ROLE_CHECK{"User Role?"}

    ROLE_CHECK -->|ADMIN| ADMIN_DECK["Admin Command Deck<br/>Full dashboard access"]
    ROLE_CHECK -->|CITIZEN| CITIZEN_PORTAL["Citizen Safety Portal<br/>SOS + Evacuation + Feed"]

    subgraph BACKEND_GUARDS["FastAPI Dependency Guards"]
        G1["get_current_user<br/><i>Any authenticated user</i>"]
        G2["get_current_active_admin<br/><i>ADMIN role only</i>"]
        G3["get_current_active_citizen<br/><i>CITIZEN + ADMIN roles</i>"]
    end

    ADMIN_DECK --> G2
    CITIZEN_PORTAL --> G3

    style USER fill:#53a8b6,stroke:#1a1a2e,color:#fff
    style GEN_JWT fill:#0f3460,stroke:#53a8b6,color:#fff
    style REJECT fill:#b3242e,stroke:#1a1a2e,color:#fff
    style ADMIN_DECK fill:#3f7d5c,stroke:#1a1a2e,color:#fff
    style CITIZEN_PORTAL fill:#d9a02d,stroke:#1a1a2e,color:#fff
```

### Role Permissions Matrix

| Capability | Admin | Citizen |
|---|:---:|:---:|
| View dashboard & analytics | ✅ | ❌ |
| Trigger scenario drills | ✅ | ❌ |
| Dispatch emergency broadcast | ✅ | ❌ |
| Resolve alerts | ✅ | ❌ |
| Submit SOS reports | ✅ | ✅ |
| View citizen safety feed | ✅ | ✅ |
| Upvote citizen reports | ✅ | ✅ |
| Access evacuation guide | ✅ | ✅ |

---

<div align="center">

**CrowdShield** — *Because every second counts when crowds become critical.*

Built with ❤️ by **Team Juggernaut** for **TechNova Season 3**

</div>
