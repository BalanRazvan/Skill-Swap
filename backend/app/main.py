from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routes import auth, profiles, skills, swaps, messages

settings = get_settings()

app = FastAPI(
    title="SkillSwap API",
    description="Trade skills, not money",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),  # Which frontend URLs are allowed
    allow_credentials=True,  # Allow cookies/auth headers
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE)
    allow_headers=["*"],  # Allow all headers (including Authorization)
)


app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(profiles.router, prefix="/api/profiles", tags=["Profiles"])
app.include_router(skills.router, prefix="/api/skills", tags=["Skills"])
app.include_router(swaps.router, prefix="/api/swaps", tags=["Swaps"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messages"])


@app.get("/api/health")
async def health_check():
    """
    Simple health check endpoint. Use this to verify:
    1. The server is running
    2. It can connect to Supabase
    Every production app needs a health check for monitoring.
    """
    return {"status": "healthy", "version": "0.1.0"}
