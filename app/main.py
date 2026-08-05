"""
FastAPI Application Entry Point
================================
Initialises the FastAPI application, registers middleware, and
includes all versioned API routers.

Run locally:
    uvicorn app.main:app --reload
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.chat_router import router as chat_router
from app.api.v1.impact_router import router as impact_router
from app.api.v1.parser_router import router as parser_router
from app.api.v1.pipeline_router import router as pipeline_router
from app.api.v1.pr_router import router as pr_router
from app.api.v1.review_router import router as review_router
from app.api.v1.router import router as v1_router
from app.api.v1.search_router import router as search_router
from app.core.config import get_settings

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    settings = get_settings()
    logger.info(
        "🚀 Starting %s v%s [%s]",
        settings.app_name,
        settings.app_version,
        settings.app_env.value,
    )
    yield
    logger.info("🛑 Shutting down %s", settings.app_name)


# ── Application ──────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    """Application factory — builds and configures the FastAPI instance."""
    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        description=(
            "Enterprise-grade AI-Powered Code Impact Analysis & Review "
            "Assistant.  Provides multi-agent AI capabilities for parsing, "
            "reviewing, and analysing code changes at scale."
        ),
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS Middleware ──────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ──────────────────────────────────────────────────────────
    application.include_router(v1_router)
    application.include_router(parser_router)
    application.include_router(search_router)
    application.include_router(impact_router)
    application.include_router(chat_router)
    application.include_router(review_router)
    application.include_router(pr_router)
    application.include_router(pipeline_router)

    return application


app = create_app()
