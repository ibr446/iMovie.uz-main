from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Vercel serverless/refresh muhitida /tmp persistent bo‘lmaydi.
# Admin panelda qo‘shilgan kinolar yo‘qolmasligi uchun DB ni o‘zboshimchalik bilan /tmp ga tushirmaymiz.
DB_PATH = os.path.join(BASE_DIR, "imovie.db")
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{DB_PATH}"

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
