# SheCodes_app_travelQue

TravelQue 🌍✈️

Resilient Travel Journey Orchestration & Management Ecosystem

📌 Project Overview

TravelQue is a centralized travel management platform designed to eliminate the "distributed failure" problem in multi-city travel. Unlike traditional booking engines that treat flights, hotels, and transfers as isolated fragments, TravelQue treats an entire itinerary as a single, connected atomic unit.

Built with a FastAPI backend and a React Native (Expo) frontend, the system uses a sequential state machine to ensure that if one part of a journey fails, the entire process pauses safely, protecting the traveler from being left in a "broken" state.

🚀 Key Features
1. Sequential Waterfall Execution

Transactional Integrity: Implements a strict booking order (Flight → Hotel → Transfer).

Dependency Logic: Downstream segments are only attempted once the preceding segment is 100% confirmed.

Halt-on-Failure: If a segment fails (e.g., price spike or no vacancy), the engine halts the sequence to prevent stranded bookings.

2. Intelligent Failure & Ops Escalation

Operations Dashboard: A dedicated interface for the Ops team to claim "broken" journeys.

Context-Aware Alternatives: Search for alternative hotels in the same city based on the original budget and traveler preferences.

Manual Override: Allows Ops to swap providers and resume the automated booking loop seamlessly.

3. Automated Rule Engine (Admin Control)

Price Volatility Tolerance: Configure the system to auto-accept price increases within a certain threshold (e.g., < $20).

Temporal Validation: Enforces buffers (e.g., 3 hours between flight landing and hotel check-in).

Documentation Check: Validates Passport expiry (> 6 months) and Visa status before execution.

4. Multi-Stakeholder RBAC

Travel Agents: Customer intake, multi-traveler group management, and journey building.

Operations (Ops): Incident management, failure resolution, and supplier health monitoring.

Administrators: Global policy configuration, budget guardrails, and master audit trail oversight.

🛠 Tech Stack

Frontend: React Native (Expo), Expo Router, Zustand (State Management), React Native Paper (UI).

Backend: FastAPI (Python), Uvicorn (ASGI Server), Pydantic (Data Validation).

Database: PostgreSQL (with SQLAlchemy ORM).

Integrations: Real-world Travel APIs (Amadeus / Duffel / Skyscanner).

Real-time: WebSockets for live booking status updates.

📂 Folder Structure
Backend (FastAPI)
backend/
├── app/
│   ├── api/v1/         # RBAC Routes (agent, ops, admin)
│   ├── core/           # Security, JWT, Rule Engine Config
│   ├── integrations/   # Real API Wrappers (Amadeus, etc.)
│   ├── models/         # Database Schemas (SQLAlchemy)
│   ├── schemas/        # Pydantic Data Models
│   ├── services/       # Orchestrator & Sequential Logic
│   └── main.py         # App Entry Point
├── .env                # API Keys & DB URL
└── requirements.txt
Frontend (React Native/Expo)

frontend/
├── app/
│   ├── (auth)/         # Login & Role Selection
│   ├── (agent)/        # Journey Builder & Dashboard
│   ├── (ops)/          # Incident Resolution Dashboard
│   ├── (admin)/        # Policy & Audit Logs
│   └── _layout.tsx     # Root Providers
├── components/         # Timeline UI, Status Badges
├── hooks/              # API Interaction Hooks
└── store/              # Zustand Global State
🚦 Application Flow

Agent Intake: Agent collects traveler details (Passport, Visa, Preferences).

Journey Building: Agent adds multi-city segments; system validates time/dependency conflicts.

Execution: The Waterfall Engine begins booking Item 1.

If Item 2 (Hotel) fails: The sequence halts.

Ops Intervention: The journey appears on the Ops Dashboard. The Ops member claims the incident, swaps the hotel, and clicks "Resume."

Completion: The system finishes the sequence (Transfer) and marks the journey as FULLY_CONFIRMED.

🔧 Installation & Setup
Backend

Navigate to the backend folder: cd backend

Create a virtual environment: python -m venv venv

Activate: source venv/bin/activate (Mac/Linux) or venv\Scripts\activate (Win)

Install dependencies: pip install -r requirements.txt

Run the server: uvicorn app.main:app --reload --host 0.0.0.0

Frontend

Navigate to the frontend folder: cd frontend

Install dependencies: npm install

Start Expo: npx expo start
