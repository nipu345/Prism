import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import config
from db import supabase

logger = logging.getLogger("prism.health")

app = FastAPI(title="Prism API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Prism API is running"}


@app.get("/health")
def health():
    """Liveness probe that deliberately touches Postgres.

    This exists to be pinged on a schedule. Two things go stale when the
    app is idle: Render's free tier spins the service down after ~15
    minutes, and Supabase's free tier pauses a project after about a week
    with no DATABASE activity. A static route would fix the first and not
    the second, so this runs a real (tiny) query.

    Returns only whether the query succeeded — never any row contents —
    and 503 on failure so an uptime pinger can alert on it.
    """
    try:
        supabase.table("companies").select("id").limit(1).execute()
    except Exception as e:
        logger.warning("health check: database unreachable: %s", e)
        return JSONResponse(status_code=503, content={"status": "degraded", "database": False})

    return {"status": "ok", "database": True}


from auth import router as auth_router
app.include_router(auth_router, prefix="/auth")

from uploads import router as uploads_router
app.include_router(uploads_router, prefix="/uploads")

from analysis import router as analysis_router
app.include_router(analysis_router, prefix="/analysis")
