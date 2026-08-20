### Frontend Source Tree

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
---
### BackendSource Tree

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
├── requirements.txt
└── .env
```
---