<div align="center">

<img src="crowdshield-frontend/public/photos/crowdshieldlogo1.png" alt="CrowdShield Logo" width="150" />

# CrowdShield

### AI-Powered Early Warning Crowd Stampede Prevention System

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/) [![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/) [![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![XGBoost](https://img.shields.io/badge/XGBoost-3.0-FF6600?style=for-the-badge&logo=xgboost&logoColor=white)](https://xgboost.readthedocs.io/) [![YOLOv11](https://img.shields.io/badge/YOLOv11-Ultralytics-00FFFF?style=for-the-badge&logo=yolo&logoColor=black)](https://docs.ultralytics.com/) [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Real-time crowd density monitoring · Predictive risk forecasting · Multi-lingual emergency response**
*Purpose-built for India's largest public venues and gatherings.*

---

</div>

**CrowdShield** is an end-to-end AI-powered platform that transforms crowd safety from **reactive** to **predictive**. It combines **edge-deployed computer vision**, **machine learning risk scoring**, and **intelligent evacuation routing** into a unified real-time command-and-control system.

The platform operates across three tightly integrated layers:

- **🔭 See** — YOLOv11-powered edge inference nodes process live CCTV feeds, performing real-time person detection and headcount estimation directly on-device, with multi-camera overlap deduplication for accurate zone-level occupancy.

- **🧠 Think** — An XGBoost gradient-boosted risk engine scores every monitored zone on a 0–100 risk scale using six engineered features (density, crowd speed, flow conflicts, reverse flow, capacity ratio, and surge score). A Ridge autoregression forecaster projects density 10 minutes into the future, enabling **early warnings before conditions become critical**. Deterministic safety overrides enforce non-negotiable escalation rules grounded in crowd-crush research.

- **⚡ Act** — When risk thresholds are breached, CrowdShield automatically generates alerts with AI-powered situational analysis, computes A\* evacuation routes that dynamically avoid high-density zones, and dispatches **multilingual emergency broadcasts** in 5 Indian languages via Sarvam AI's Bulbul TTS engine. Volunteer task dispatch and citizen SOS reporting create a human-in-the-loop response network.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **Real-Time Crowd Monitoring** | Live zone-level density, headcount, flow rate, and risk scores streamed via WebSocket |
| **XGBoost Risk Engine** | 6-feature ML model with physics-grounded safety overrides for stampede precursor detection |
| **Predictive Forecasting** | 10-minute density projection using Ridge autoregression — warns *before* danger, not after |
| **A\* Evacuation Routing** | Dynamic shortest-safest-path computation over venue topology, with live density-penalized edge costs |
| **Edge AI Vision Pipeline** | YOLOv11 person detection on CCTV feeds with ByteTrack multi-object tracking |
| **Multi-Camera Deduplication** | Overlap-aware headcount correction across adjacent camera zones |
| **Digital Twin** | Interactive 2D/3D venue visualization with real-time zone heatmaps and evacuation path overlays |
| **Multilingual Emergency PA** | Text-to-speech broadcasts in English, Hindi, Odia, Bengali, and Tamil via Sarvam AI |
| **Citizen Safety Portal** | Mobile-first SOS reporting, community hazard upvoting, and turn-by-turn evacuation guidance |
| **Gemini AI Summaries** | Automated NDRF-format post-incident reports generated via Google Gemini |
| **Role-Based Access Control** | Admin command deck, volunteer operations, and citizen safety views with JWT authentication |
| **Evacuation Drill Mode** | Gamified compass-guided drill simulations for crowd preparedness training |
| **Voice Commands** | Natural language voice control via Web Speech API with NLP command parsing |

---

## 🛠️ Technology Stack

### Edge Layer
| Technology | Purpose |
|---|---|
| **YOLOv11** (Ultralytics) | Real-time person detection on CCTV streams |
| **OpenCV** | Video frame processing and optical flow estimation |
| **XGBoost** | On-device risk pre-scoring |
| **ByteTrack** | On-device multi-object tracking |

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** + **Uvicorn** | Async REST API + WebSocket server |
| **SQLAlchemy 2.0** (async) + **asyncpg** | ORM and async PostgreSQL driver |
| **Neon PostgreSQL** | Cloud-hosted serverless database |
| **XGBoost** | Gradient-boosted crowd risk scoring |
| **scikit-learn** (Ridge) | Autoregressive density forecasting |
| **NetworkX** | A\* pathfinding over spatial venue graphs |
| **Google Gemini** | NDRF post-incident report generation |
| **Sarvam AI** (Bulbul v3) | Multilingual text-to-speech synthesis |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** + **TypeScript 5.8** | Component UI with static type safety |
| **Vite 6** | Lightning-fast HMR and production bundling |
| **TailwindCSS 4** | Utility-first styling with cartographic design tokens |
| **Three.js** + **React Three Fiber** | 3D digital twin WebGL rendering |
| **Leaflet** + **React-Leaflet** | GIS map with interactive zone polygon overlays |
| **Recharts** | Real-time density trend charts and analytics |
| **Framer Motion** | Fluid micro-animations and parallax effects |
| **Turf.js** | Geofence proximity calculations |
| **Playwright** | End-to-end browser testing |

---

## 🚀 Quick Start

**Detailed instructions to run the project locally is given in this file: [Quick Start Guide](Quickstart.md)**

### Prerequisites

- **Python 3.11+** and **pip**
- **Node.js 18+** and **npm** (or **Bun**)
- A **Neon PostgreSQL** database ([neon.tech](https://neon.tech))
- API keys for **Sarvam AI** and **Google Gemini** (optional, for TTS and summaries)

### 1. Clone the Repository

```bash
git clone https://github.com/newprogrammer07/Crowdshield
cd Crowdshield
```

### 2. Backend Setup

```bash
cd crowdshield-backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your Neon DB connection string, JWT secret, and API keys

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> **API Docs**: Once running, visit [localhost:8000/docs](http://localhost:8000/docs) (Swagger) or [localhost:8000/redoc](http://localhost:8000/redoc) (ReDoc)

### 3. Frontend Setup

```bash
cd crowdshield-frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

> **App**: Open [localhost:3000](http://localhost:3000) in your browser

### 4. Edge Inference (Optional)

```bash
cd crowdshield-edge

# Install dependencies
pip install -r requirements.txt

# Run edge node with a video source
python edge_inference.py --video video.mp4 --zone z-1 --venue soa-iter-01 --port 5000
```

---

## 🌍 Multilingual Support

CrowdShield supports emergency communications in **5 Indian languages**, powered by **Sarvam AI's Bulbul v3** text-to-speech engine:

| Language | Script | Code |
|---|---|---|
| 🇬🇧 English | Latin | `en` |
| 🇮🇳 Hindi | देवनागरी | `hi` |
| 🇮🇳 Odia | ଓଡ଼ିଆ | `od` |
| 🇮🇳 Bengali | বাংলা | `bn` |
| 🇮🇳 Tamil | தமிழ் | `ta` |

Both the **Admin Dashboard** and the **Citizen Safety Portal** UI are fully translated across all supported languages.

---

## 🎯 Pre-Configured Venues

CrowdShield ships with two pre-seeded real-world venue configurations for immediate demonstration:

| Venue | Location | Zones |
|---|---|---|
| **SOA ITER Campus** | Bhubaneswar, Odisha | 6 zones — gates, admin block road, library roundabout, sports complex, E-block lawn |
| **Kalinga International Stadium** | Nayapalli, Bhubaneswar | 6 zones — sky walk, swimming complex, athletics area, parking, badminton court |

Each venue includes a complete spatial topology graph for A\* evacuation routing.

---

## 🏆 Team Juggernaut

CrowdShield is designed, engineered, and maintained by **Team Juggernaut** — a team of three passionate developers committed to building technology that saves lives.

<div align="center">

| | Team Member | GitHub |
|---|---|---|
| 👨‍💻 | **Siddharth Kumar Jena** | [@Sid-is-afk](https://github.com/Sid-is-afk) |
| 👨‍💻 | **Ashutosh Nayak** | [@newprogrammer07](https://github.com/newprogrammer07) |
| 👨‍💻 | **Ayutayam Sutar** | [@Ayutayam-sutar](https://github.com/Ayutayam-sutar) |

</div>

---

## 🙏 Acknowledgements

- **[Ultralytics](https://ultralytics.com/)** — YOLOv11 object detection framework
- **[Sarvam AI](https://www.sarvam.ai/)** — Bulbul v3 multilingual TTS engine for Indian languages
- **[Google Gemini](https://ai.google.dev/)** — Generative AI for post-incident NDRF summaries
- **[Neon](https://neon.tech/)** — Serverless PostgreSQL cloud database
- **[XGBoost](https://xgboost.readthedocs.io/)** — Gradient boosting framework for risk scoring
- **[NetworkX](https://networkx.org/)** — Graph algorithms for A\* pathfinding
- **[FastAPI](https://fastapi.tiangolo.com/)** — High-performance async Python web framework
- **[React](https://react.dev/)** — UI component library
- **[Three.js](https://threejs.org/)** — WebGL 3D rendering for digital twin visualization
- **[Leaflet](https://leafletjs.com/)** — Interactive mapping for GIS zone overlays
- **Different Generative AI Models were used for research purposes and as helpers** 
- **This project is built by humans along with the help of AI**

---

## 📚 References

<a id="references"></a>

1. **National Disaster Management Authority (NDMA), India** — *"Managing Crowd at Events and Places of Mass Gathering"*, NDMA Guidelines, Government of India. Available at: [ndma.gov.in](https://ndma.gov.in/)

2. **Seoul Metropolitan Government Investigation Report** — *"Itaewon Crowd Crush Investigation"*, 2023. Documenting the October 29, 2022 crowd crush that killed 159 people.

3. **Still, G.K.** — *"Introduction to Crowd Science"*, CRC Press, 2014. Foundational reference on crowd density thresholds (>4 p/m² as lethal crush risk) and the sub-90-second window for stampede cascade. ISBN: 978-1-4665-7964-4.

4. **Fruin, J.J.** — *"The Causes and Prevention of Crowd Disasters"*, originally presented at the First International Conference on Engineering for Crowd Safety, 1993. Seminal work establishing density-based Level of Service standards for pedestrian facilities.

5. **Helbing, D., Johansson, A., & Al-Abideen, H.Z.** — *"Dynamics of crowd disasters: An empirical study"*, Physical Review E, 75(4), 2007. Research on crowd turbulence and shock-wave propagation in high-density gatherings (Mina/Makkah Hajj analysis).

---

<div align="center">

**CrowdShield** — *Because every second counts when crowds become critical.*

Built with ❤️ by **Team Juggernaut** for **TechNova Season3**·

</div>
