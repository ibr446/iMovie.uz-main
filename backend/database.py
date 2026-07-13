from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import logging

logger = logging.getLogger("uvicorn.error")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Vercel/Neon integratsiyasi turli nomlar bilan URL berishi mumkin —
# hammasini tekshiramiz, birinchi topilganini ishlatamiz.
DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("POSTGRES_URL")
    or os.getenv("POSTGRES_PRISMA_URL")
    or os.getenv("DATABASE_URL_UNPOOLED")
)

IS_SERVERLESS = bool(os.getenv("VERCEL"))

if DATABASE_URL:
    # Ba'zi provayderlar "postgres://" beradi, SQLAlchemy 2.x buni yoqtirmaydi
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    logger.info(f"DATABASE_URL topildi, ulanish manzili: {DATABASE_URL.split('@')[-1]}")
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    if IS_SERVERLESS:
        # Vercel'da fayl yozib bo'lmaydi — SQLite fallback qilib xatoni
        # keyinga surish o'rniga, aniq va tushunarli xato beramiz.
        raise RuntimeError(
            "DATABASE_URL topilmadi! Vercel'da PostgreSQL ulanishi shart "
            "(Settings -> Environment Variables -> DATABASE_URL). "
            "SQLite Vercel serverless muhitida ishlamaydi."
        )
    # Faqat lokal (kompyuteringizda) ishlaganda SQLite'ga tushamiz
    DB_PATH = os.path.join(BASE_DIR, "imovie.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    logger.info("DATABASE_URL topilmadi, lokal SQLite ishlatiladi")
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency: yields a database session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()