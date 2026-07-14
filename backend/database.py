from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import logging

logger = logging.getLogger("uvicorn.error")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Vercel/Neon integratsiyasi turli nomlar bilan URL berishi mumkin —
# hammasini tekshiramiz, birinchi topilganini ishlatamiz.
DATABASE_URL = (
    os.environ.get("DATABASE_POSTGRES_URL")
    or os.getenv("POSTGRES_URL")
    or os.getenv("POSTGRES_PRISMA_URL")
    or os.getenv("DATABASE_URL_UNPOOLED")
)

IS_SERVERLESS = bool(os.getenv("VERCEL"))

if DATABASE_URL:
    # Ba'zi provayderlar "postgres://" beradi, SQLAlchemy 2.x buni yoqtirmaydi
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    # Neon/ko‘plab provayderlarda async driver yoki psycopg2 talab qilinmasligi mumkin.
    # SQLAlchemy PostgreSQL backend uchun psycopg2 ishlatadi; uni o‘rnatilmagan bo‘lsa import xato beradi.
    # Shuning uchun DATABASE_URL ni "psycopg2" o‘rniga "pg8000" bilan ishlatishga moslaymiz.
    # (Vercel environment’da pg8000 ko‘p hollarda o‘rnatilgan bo‘ladi yoki dependency qo‘shiladi.)
    logger.info(f"DATABASE_URL topildi, ulanish manzili: {DATABASE_URL.split('@')[-1]}")

    # SQLAlchemy PostgreSQL driver'lari "channel_binding" kabi qo‘shimcha keyword uzatishi mumkin.
    # Neon kabi provayderlarda TypeError kelmasligi uchun pool_pre_ping opsiyasini ham olib tashlaymiz.
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

    # pg8000 "channel_binding" parametrini tushunmaydi — uni URL'dan olib tashlaymiz
    from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

    parts = urlsplit(DATABASE_URL)
    query_params = [(k, v) for k, v in parse_qsl(parts.query) if k != "channel_binding"]
    DATABASE_URL = urlunsplit((
        parts.scheme, parts.netloc, parts.path,
        urlencode(query_params), parts.fragment
    ))

    engine = create_engine(DATABASE_URL)

else:
    # Vercel’da admin refreshdan keyin yo‘qolmasligi uchun SQLite ishlatishimiz kerak bo‘lsa,
    # kamida bir xil fayl yo‘li ishlatilishi zarur.
    # (Agar Vercelda persistent volume bo‘lmasa, baribir yo‘qolishi mumkin.)
    DB_PATH = os.path.join(BASE_DIR, "imovie.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    logger.warning(
        "DATABASE_URL topilmadi. SQLite ishlatiladi. "
        "Agar Vercel serverless ephemeral bo‘lsa, refresh/deployda ma’lumot yo‘qolishi mumkin."
    )
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