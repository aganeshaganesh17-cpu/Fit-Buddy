# FitBuddy – AI Fitness Plan Generator

FitBuddy is a full-stack, AI-powered fitness planning web application that generates personalized, science-backed 7-day workout plans, custom nutrition targets, and recovery guidance using the **Google Gemini API** (`gemini-3.8-flash`, free/basic tier compatible). FitBuddy features an iterative feedback refinement loop and stores all users, workout schedules, and revisions in a local **SQLite database**.

---

## 🌟 Key Features

1. **Personalized 7-Day Workout Plan Generator**:
   - Captures User Name, Unique User ID, Age, Weight (kg), Primary Fitness Target, Workout Intensity, Experience Level, and Equipment Preferences.
   - Generates a day-by-day progression (Days 1–7) including dynamic warm-ups, exercise routines (sets, reps, rest intervals, target muscle groups, biomechanical cues), and cool-downs.
   - Generates personalized daily nutrition advice (protein grams calculation, hydration metrics, meal timing) and recovery guidance (sleep duration, mobility, soreness mitigation).

2. **Iterative Feedback & Plan Refinement Loop**:
   - Users can provide iterative feedback such as:
     - *"Add more cardio"*
     - *"Reduce workout intensity"*
     - *"Include more rest days"*
     - *"Add yoga"*
     - *"Focus more on upper body"*
     - *"I have only 30 minutes per day"*
   - Gemini updates the 7-day schedule to match the constraints while maintaining progressive overload and biometrics.
   - Saves each revision as a new version (v1, v2, v3...) with an explicit change summary in the SQLite database.

3. **Persistent Local SQLite Database**:
   - Tables:
     - `users`: Stores user biometrics, goals, and timestamps.
     - `workout_plans`: Stores 7-day plan versions, summaries, exercise arrays, and nutrition/recovery advice.
     - `feedback_history`: Tracks the feedback prompts, changes applied, and links between previous and new plans.
   - Automatic disk persistence to `fitbuddy.sqlite`.

4. **Interactive Rest Interval Timer**:
   - Audio and visual countdown timer (30s, 60s, 90s, 120s) directly integrated into the workout session cards.

5. **Administrator Dashboard**:
   - System overview metrics: Total registered users, total plans generated, feedback revisions, top goal distribution.
   - Searchable and filterable data tables for athletes and workout plans.
   - Modal inspection to review full 7-day schedules and feedback chains.
   - Delete controls for individual plans or users with cascade cleanup.
   - One-click SQLite database JSON backup export.

6. **Free-Tier Compatible AI**:
   - Utilizes `gemini-3.8-flash` via the official `@google/genai` SDK on the server side.
   - Never exposes API keys in frontend code.
   - Model name is configurable via the `GEMINI_MODEL` environment variable.

---

## 🏗️ Architecture

```
FitBuddy/
├── server.ts                 # Full-stack Node/Express server (Vite dev middleware & production static)
├── server/
│   ├── database.ts           # SQLite database initialization, schema, queries & persistence
│   ├── gemini_service.ts     # Gemini AI generation & iterative feedback service
│   ├── routes.ts             # Express REST API endpoints (/api/*)
│   └── types.ts              # Shared TypeScript data models & schemas
│
├── src/                      # Modern React UI
│   ├── components/
│   │   ├── Navbar.tsx        # Navigation & model status indicator
│   │   ├── PlanGenerator.tsx # Biometric input form & sample presets
│   │   ├── PlanView.tsx      # 7-day schedule view & feedback refinement panel
│   │   ├── RestTimer.tsx     # In-workout rest interval timer
│   │   └── AdminDashboard.tsx# Database administration & record inspection
│   ├── App.tsx               # State coordinator & tab router
│   ├── main.tsx              # React DOM entry point
│   └── types.ts              # Frontend TypeScript definitions
│
├── app/                      # Python FastAPI implementation (Alternative backend)
│   ├── __init__.py
│   ├── main.py               # FastAPI application entry
│   ├── routes.py             # FastAPI API endpoints
│   ├── database.py           # SQLAlchemy SQLite connection
│   ├── models.py             # SQLAlchemy User, WorkoutPlan, FeedbackHistory models
│   ├── schemas.py            # Pydantic validation schemas
│   └── gemini_service.py     # Python Google GenAI SDK integration
├── requirements.txt          # Python dependencies
├── run.py                    # Uvicorn launcher
│
├── fitbuddy.sqlite           # Persistent SQLite database file
├── .env.example              # Environment variables template
├── package.json              # Node.js dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

---

## 🚀 Quick Start Guide

### Option A: Node.js / Express Full-Stack (Default in this environment)

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set your Google Gemini API key:
   ```env
   GEMINI_API_KEY="your-gemini-api-key-here"
   GEMINI_MODEL="gemini-3.8-flash"
   PORT=3000
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

### Option B: Python / FastAPI Backend

If you prefer running the Python FastAPI stack:

1. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set Environment Variables**:
   ```bash
   export GEMINI_API_KEY="your-gemini-api-key-here"
   export GEMINI_MODEL="gemini-3.8-flash"
   export PORT=3000
   ```

3. **Run the FastAPI Server**:
   ```bash
   python run.py
   ```
   API docs will be available at [http://localhost:3000/docs](http://localhost:3000/docs).

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Health check & model status |
| `POST` | `/api/generate-plan` | Validates user data, calls Gemini, and saves 7-day plan v1 |
| `POST` | `/api/update-plan` | Submits feedback to Gemini and saves updated plan v(N+1) |
| `GET` | `/api/users/:userId` | Retrieves user profile and all workout versions |
| `GET` | `/api/plans/:planId` | Retrieves full 7-day schedule and feedback history |
| `GET` | `/api/admin/stats` | Aggregated user and plan metrics |
| `GET` | `/api/admin/data` | Complete list of users and plans for dashboard |
| `DELETE` | `/api/admin/plans/:id` | Deletes a workout plan from SQLite |
| `DELETE` | `/api/admin/users/:userId` | Deletes an athlete profile and cascades related plans |

---

## 🔒 Security & Privacy

- All Gemini API interactions happen **strictly on the server**.
- The `GEMINI_API_KEY` is never transmitted to or bundled within the client browser.
- Free-tier rate limits are safely respected.
