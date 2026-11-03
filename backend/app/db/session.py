from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

Base = declarative_base()

# Ensure every model is imported before any database bootstrap so the metadata
# contains the schema required by the app and background jobs.
import app.models  # noqa: F401

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Local/dev environments often start without running Alembic migrations. Create
# any missing tables from the ORM metadata so the app can boot reliably.
Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()