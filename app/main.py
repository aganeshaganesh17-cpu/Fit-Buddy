from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FitBuddy – AI Fitness Plan Generator",
    description="Full-stack AI fitness planning with Gemini and SQLite",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"message": "FitBuddy API is running. Access endpoints via /api"}
