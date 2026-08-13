import os
import sys
import logging
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

logger = logging.getLogger("cloudguard.db")

Base = declarative_base()

def _sqlite_url() -> str:
    if os.getenv("VERCEL"):
        return "sqlite:////tmp/cloudguard.db"
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    return f"sqlite:///{project_root.as_posix()}/cloudguard.db"

def get_engine():
    db_url = settings.DATABASE_URL
    try:
        if db_url.startswith("postgresql"):
            # Test PostgreSQL connection engine creation
            engine = create_engine(db_url, pool_pre_ping=True)
            with engine.connect() as conn:
                pass
            logger.info("Successfully connected to PostgreSQL database.")
            return engine
    except Exception as e:
        logger.warning(f"PostgreSQL connection failed ({e}). Falling back to SQLite for resilient local runtime.")
        return create_engine(_sqlite_url(), connect_args={"check_same_thread": False})
    
    if db_url.startswith("sqlite"):
        return create_engine(db_url, connect_args={"check_same_thread": False})
        
    return create_engine(db_url)

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
