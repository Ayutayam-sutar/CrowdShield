# 🚀 CrowdShield — Quickstart Guide

A step-by-step guide to run the entire CrowdShield application locally and test the deployed prototype.

---

## 📋 Prerequisites

Before you begin, ensure the following are installed on your system:

- **Python 3.10+** → [Download](https://www.python.org/downloads/)
- **Node.js 18+** & **npm** → [Download](https://nodejs.org/)
- **Git** → [Download](https://git-scm.com/)

---

## 🏗️ Running Locally (All 3 Services)

CrowdShield consists of three independent services that need to be started in a specific order.  
Open **three separate terminal windows** — one for each service.

---

### 1️⃣ Backend — `crowdshield-backend`

The backend is a **FastAPI** server connected to a **Neon PostgreSQL** database.

```bash
# Navigate to the backend folder
cd crowdshield-backend

# Create and activate a virtual environment
python -m venv venv

# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the backend server (runs on port 8000)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ The backend will be live at **`http://localhost:8000`**  
📄 API docs available at **`http://localhost:8000/docs`**

---

### 2️⃣ Frontend — `crowdshield-frontend`

The frontend is a **React + Vite** application that serves both the **Admin Dashboard** (web) and the **Citizen App** (via Capacitor APK, can also be tested in localhost).

```bash
# Navigate to the frontend folder
cd crowdshield-frontend

# Install Node.js dependencies
npm install

# Start the development server (runs on port 3000)
npm run dev
```

✅ The frontend will be live at **`http://localhost:3000`**
**Admin Credentials** : email: admin2@gmail.com, password: 1234
**Citizen Credentials** : email: ok@gmail.com, password: 123456

> **Note:** In development mode, the frontend automatically points to `http://localhost:8000` as the API URL (configured in `.env.development`).

---

### 3️⃣ Edge Processing — `crowdshield-edge`

The edge service handles **real-time video inference** using YOLO and XGBoost models. It processes camera feeds and sends telemetry data to the backend.

```bash
# Navigate to the edge folder
cd crowdshield-edge

# Create and activate a virtual environment
python -m venv venv

# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the edge server
python run_cameras.py
```

✅ The edge server will be live at **`http://localhost:8000`** (default)  
📹 Camera streams accessible at **`http://localhost:8000/stream/{zone_id}`**

> **Note:** Make sure the backend is already running before starting the edge service, as the edge server sends telemetry data to the backend at the configured `BACKEND_URL`.

---

## 🌐 Deployed Links

The project is deployed and can be tested using the following links:

| Service | Link |
|---------|------|
| 🖥️ **Admin Dashboard** (Netlify) | `[Link will be added]` |
| ⚙️ **Backend API** (Render) | `[Link will be added]` |
| 📱 **Citizen App APK** | `[Link will be added]` |

---

## 🧪 Testing the Deployed Prototype

Follow the steps below to test the complete CrowdShield prototype using the deployed links:

### Step 1 — Start the Edge Service Locally

The edge processing service must run on **localhost** as it requires GPU/CPU resources for real-time video inference.

```bash
cd crowdshield-edge
python run_cameras.py
```

Make sure the edge service is running and actively processing camera feeds before proceeding.

### Step 2 — Test the Admin Dashboard

1. Open the **Netlify link** (from the table above) in your browser.
2. Login to the **Admin Panel** using the admin credentials.
3. You will be able to monitor live crowd telemetry, manage venues, view risk alerts, and access the AI-powered incident summaries.

### Step 3 — Test the Citizen App

1. Download and install the **APK** (from the link above) on your Android device.
2. Open the app and **login/register** as a Citizen.
3. You will be able to view real-time crowd density of nearby venues, receive safety alerts, and get AI-driven safety advisories.

---

## ⚠️ Important Note on Testing

> For **demonstration and testing purposes**, the risk threshold values in this prototype have been intentionally **reduced** from real-world parameters. This means alerts and warnings will trigger more frequently and at lower crowd density levels than they would in an actual production deployment. 

---
