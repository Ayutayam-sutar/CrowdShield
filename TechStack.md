## Technology Stack

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
| AI SDK | Google GenAI | 3.5 | Client-side Gemini integration |
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

### API Keys Used
API Key | Service | URL | Purpose
---|---|---|---
`Sarvam_Bulbul` | **Sarvam AI** | `sarvam.ai/bulbul` | Voice synthesis for alerts
`Google_Gemini` | **Google** | `ai.google.dev` | Incident summaries + alerts
