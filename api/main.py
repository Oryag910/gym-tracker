import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.database import engine, Base
from api.routers import auth, workouts, stats, exercises

# Create all tables on startup (including exercise_cache)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gym Tracker API", version="1.0.0")

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workouts.router)
app.include_router(stats.router)
app.include_router(exercises.router)


@app.get("/health")
def health():
    return {"status": "ok"}
