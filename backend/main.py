from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.config import settings
from backend.supabase_client import get_supabase
from backend.routes import auth, patients, appointments, chatbot, audio, dashboard, assessments, treatment, treatment_ai, chatbot_ai
from fastapi.staticfiles import StaticFiles
import uvicorn
import asyncio
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

# Background task: clean up cancelled appointments older than 1 hour
async def cleanup_cancelled_appointments():
    while True:
        try:
            await asyncio.sleep(600)  # Run every 10 minutes
            supabase = get_supabase()
            one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            
            # Delete cancelled appointments where cancellation time (updated_at) is older than 1 hour
            resp = supabase.table("appointments") \
                .delete() \
                .eq("status", "Cancelled") \
                .lt("updated_at", one_hour_ago) \
                .execute()
            
            if resp.data:
                logger.info(f"[CLEANUP] Removed {len(resp.data)} cancelled appointments")
        except Exception as e:
            logger.error(f"[CLEANUP ERROR] {e}")

@asynccontextmanager
async def lifespan(app):
    # Startup: launch background cleanup task
    task = asyncio.create_task(cleanup_cancelled_appointments())
    logger.info("[STARTUP] Background cleanup task started")
    yield
    # Shutdown: cancel the task
    task.cancel()

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROUTES
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(appointments.router, prefix="/api/appointments", tags=["Appointments"])
app.include_router(chatbot.router, prefix="/api/chat", tags=["AI Chatbot"])
app.include_router(audio.router, prefix="/api/audio", tags=["Audio Management"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(assessments.router, prefix="/api/assessments", tags=["Assessments"])
app.include_router(treatment.router, prefix="/api/treatment", tags=["Treatment"])
app.include_router(treatment_ai.router, prefix="/api/ai/treatment", tags=["AI Treatment"])
app.include_router(chatbot_ai.router, prefix="/api/ai/chatbot", tags=["AI Clinical Assistant"])

# Serve Static Files (Frontend)
# This allows you to access the frontend at http://localhost:8000
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
