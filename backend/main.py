import mimetypes
import uvicorn
import os
import sys
import uuid
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from database import engine, SessionLocal, Base
from models import User, Movie, ShortVideo
from auth import hash_password

from routers.auth_router import router as auth_router
from routers.movies_router import router as movies_router
from routers.comments_router import router as comments_router
from routers.users_router import router as users_router
from routers.shorts_router import router as shorts_router


CHUNK_SIZE = 1024 * 1024


def iter_file_range(file_path: str, start: int, end: int):
    with open(file_path, "rb") as video:
        video.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = video.read(min(CHUNK_SIZE, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


def resolve_file_path(root_dir: str, filename: str):
    direct_path = os.path.abspath(os.path.join(root_dir, filename))
    if direct_path.startswith(root_dir + os.sep) and os.path.isfile(direct_path):
        return direct_path

    current_path = root_dir
    for part in filename.replace("\\", "/").split("/"):
        if not part or part in {".", ".."}:
            return None

        try:
            entries = os.listdir(current_path)
        except OSError:
            return None

        match = next((entry for entry in entries if entry.lower() == part.lower()), None)
        if not match:
            return None

        current_path = os.path.abspath(os.path.join(current_path, match))
        if not current_path.startswith(root_dir + os.sep):
            return None

    return current_path if os.path.isfile(current_path) else None


def resolve_media_path(filename: str):
    return resolve_file_path(MOVIES_DIR_ABS, filename)


def resolve_short_path(filename: str):
    return resolve_file_path(SHORTS_DIR_ABS, filename)


def stream_file_response(file_path: str, request: Request):
    file_size = os.path.getsize(file_path)
    media_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
    supports_range = media_type.startswith(("video/", "audio/"))
    range_header = request.headers.get("range")

    if range_header and supports_range:
        range_value = range_header.strip().lower()
        if not range_value.startswith("bytes="):
            raise HTTPException(status_code=416, detail="Invalid range")

        start_text, _, end_text = range_value.replace("bytes=", "", 1).partition("-")
        if start_text:
            start = int(start_text)
            end = int(end_text) if end_text else file_size - 1
        else:
            suffix_length = int(end_text)
            start = max(file_size - suffix_length, 0)
            end = file_size - 1

        end = min(end, file_size - 1)
        if start >= file_size or start > end:
            return StreamingResponse(
                iter(()),
                status_code=416,
                headers={
                    "Content-Range": f"bytes */{file_size}",
                    "Accept-Ranges": "bytes",
                },
            )

        return StreamingResponse(
            iter_file_range(file_path, start, end),
            status_code=206,
            media_type=media_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Content-Length": str(end - start + 1),
            },
        )

    return StreamingResponse(
        iter_file_range(file_path, 0, file_size - 1),
        media_type=media_type,
        headers={
            "Accept-Ranges": "bytes" if supports_range else "none",
            "Content-Length": str(file_size),
        },
    )



def seed_database():
    """Seed the database with initial data if empty."""
    db = SessionLocal()
    try:
        # Check if data already exists
        if db.query(User).count() > 0:
            return

        print("🌱 Seeding database...")

        # Create admin user
        admin = User(
            id="admin-1",
            name="Super Admin",
            email="admin@imovie.uz",
            hashed_password=hash_password("admin123"),
            avatar="https://picsum.photos/seed/admin/100/100",
            role="admin",
        )
        db.add(admin)

        # Create demo user
        demo_user = User(
            id="user-demo1",
            name="Demo User",
            email="user@imovie.uz",
            hashed_password=hash_password("user123"),
            avatar="https://picsum.photos/seed/demo/100/100",
            role="user",
        )
        db.add(demo_user)

        # Seed movies
        movies_data = [
            Movie(
                id="1",
                title_en="The Cosmic Horizon",
                title_ru="Космический Горизонт",
                title_uz="Koinot Gorizonti",
                description_en="An intrepid crew of explorers embarks on a journey beyond the edge of the known universe.",
                description_ru="Отважная команда исследователей отправляется в путешествие за край известной вселенной.",
                description_uz="Jasur tadqiqotchilar jamoasi ma'lum koinot chekkasidan tashqariga sayohatga chiqadi.",
                poster="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80",
                backdrop="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&q=80",
                video_url="/media/videoplayback.mp4",
                year=2024,
                genre=["Sci-Fi", "Adventure"],
                rating=8.9, 
                duration="2h 15m",
                country="USA",
                is_trending=True,
                is_new=True,
                views=125430,
            ),
            Movie(
                id="2",
                title_en="Midnight in Tashkent",
                title_ru="Полночь в Ташкенте",
                title_uz="Toshkentda yarim tun",
                description_en="A detective is pulled into a web of conspiracy in the heart of Uzbekistan.",
                description_ru="Детектив оказывается втянут в паутину заговора в самом сердце Узбекистана.",
                description_uz="Detektiv O'zbekiston markazida fitna to'riga tushib qoladi.",
                poster="https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80",
                backdrop="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80",
                video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
                year=2023,
                genre=["Drama", "Mystery"],
                rating=7.5,
                duration="1h 50m",
                country="Uzbekistan",
                is_trending=True,
                is_new=False,
                views=89020,
            ),
            Movie(
                id="3",
                title_en="Silk Road Warriors",
                title_ru="Воины Шёлкового Пути",
                title_uz="Ipak Yo'li Jangchilari",
                description_en="An epic tale of warriors protecting trade caravans along the ancient Silk Road.",
                description_ru="Эпическая история воинов, защищающих торговые караваны на древнем Шёлковом пути.",
                description_uz="Qadimiy Ipak yo'lida savdo karvonlarini himoya qilgan jangchilar haqida dostoniy hikoya.",
                poster="https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
                backdrop="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80",
                video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
                year=2024,
                genre=["Action", "Adventure"],
                rating=8.2,
                duration="2h 30m",
                country="Uzbekistan",
                is_trending=False,
                is_new=True,
                views=67500,
            ),
            Movie(
                id="4",
                title_en="Love in Samarkand",
                title_ru="Любовь в Самарканде",
                title_uz="Samarqandda Muhabbat",
                description_en="A timeless love story set against the backdrop of the stunning Registan Square.",
                description_ru="Вечная история любви на фоне потрясающей площади Регистан.",
                description_uz="Registon maydonining go'zal manzarasi fonida abadiy sevgi hikoyasi.",
                poster="https://images.unsplash.com/photo-1518676590747-1e3dcf5a6c48?w=800&q=80",
                backdrop="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600&q=80",
                video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
                year=2025,
                genre=["Romance", "Drama"],
                rating=7.8,
                duration="1h 45m",
                country="Uzbekistan",
                is_trending=True,
                is_new=True,
                views=45000,
            ),
            Movie(
                id="5",
                title_en="The Last Code",
                title_ru="Последний Код",
                title_uz="Oxirgi Kod",
                description_en="A cybersecurity expert must crack an impossible code to prevent a global catastrophe.",
                description_ru="Эксперт по кибербезопасности должен взломать невозможный код, чтобы предотвратить глобальную катастрофу.",
                description_uz="Kiberhavfsizlik mutaxassisi global falokatni oldini olish uchun imkonsiz kodni buzishi kerak.",
                poster="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
                backdrop="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80",
                video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
                year=2024,
                genre=["Sci-Fi", "Action"],
                rating=8.5,
                duration="2h 05m",
                country="USA",
                is_trending=False,
                is_new=True,
                views=92300,
            ),
            Movie(
                id="6",
                title_en="Shadows of Bukhara",
                title_ru="Тени Бухары",
                title_uz="Buxoro Soyalari",
                description_en="An archaeologist uncovers a dark secret hidden beneath the ancient city of Bukhara.",
                description_ru="Археолог раскрывает тёмную тайну, скрытую под древним городом Бухара.",
                description_uz="Arxeolog Buxoro qadimiy shahri ostida yashiringan qorong'u sirni ochadi.",
                poster="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80",
                backdrop="https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1600&q=80",
                video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
                year=2023,
                genre=["Horror", "Mystery"],
                rating=7.2,
                duration="1h 55m",
                country="Uzbekistan",
                is_trending=False,
                is_new=False,
                views=34800,
            ),
            Movie(
                id="7",
                title_en="Comedy Club Tashkent",
                title_ru="Камеди Клуб Ташкент",
                title_uz="Toshkent Kulgu Klubi",
                description_en="A hilarious comedy about a group of friends trying to open a comedy club in Tashkent.",
                description_ru="Весёлая комедия о группе друзей, пытающихся открыть комеди-клуб в Ташкенте.",
                description_uz="Toshkentda kulgu klubi ochmoqchi bo'lgan do'stlar guruhi haqida kulgili komediya.",
                poster="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80",
                backdrop="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1600&q=80",
                video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
                year=2025,
                genre=["Comedy"],
                rating=7.9,
                duration="1h 40m",
                country="Uzbekistan",
                is_trending=True,
                is_new=True,
                views=78200,
            ),
            Movie(
                id="8",
                title_en="Eternal Flame",
                title_ru="Вечный Огонь",
                title_uz="Abadiy Olov",
                description_en="A war drama depicting the courage of soldiers defending their homeland.",
                description_ru="Военная драма о мужестве солдат, защищающих свою родину.",
                description_uz="Vatanini himoya qilgan askarlarning jasoratlari haqida urush dramasi.",
                poster="https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80",
                backdrop="https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&q=80",
                video_url="https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
                year=2023,
                genre=["Drama", "Action"],
                rating=8.7,
                duration="2h 20m",
                country="Uzbekistan",
                is_trending=False,
                is_new=False,
                views=56700,
            ),
        ]

        for movie in movies_data:
            db.add(movie)

        db.commit()
        print(f"✅ Seeded {len(movies_data)} movies, admin + demo user created")
        print("   Admin: admin@imovie.uz / admin123")
        print("   Demo:  user@imovie.uz / user123")

    except Exception as e:
        print(f"❌ Seeding error: {e}")
        db.rollback()
    finally:
        db.close()


def seed_shorts():
    db = SessionLocal()
    try:
        local_video_urls = {
            "short-1": "1.mp4",
            "short-2": "football.mp4",
            "short-3": "videoplayback (1).mp4",
        }

        if db.query(ShortVideo).count() > 0:
            changed = False
            for short_id, video_url in local_video_urls.items():
                short = db.query(ShortVideo).filter(ShortVideo.id == short_id).first()
                if short and resolve_short_path(video_url) and short.video_url != video_url:
                    short.video_url = video_url
                    changed = True
            if changed:
                db.commit()
                print("Updated seeded shorts to local video files")
            return

        shorts_data = [
            ShortVideo(
                id="short-1",
                user_id="admin-1",
                author="@imovie_official",
                name="iMovie.uz",
                avatar="https://picsum.photos/seed/imovie-official/96/96",
                video_url="1.mp4",
                caption="The Cosmic Horizon sahnasidan maxsus lavha. Katta ekranga tayyormisiz?",
                audio="iMovie.uz Original Sound",
                location="Tashkent",
                tags=["cinema", "behindthescenes", "uzbekistan"],
                likes=0,
                shares=842,
                views=118000,
            ),
            ShortVideo(
                id="short-2",
                user_id="admin-1",
                author="@cine_lover",
                name="Cine Lover",
                avatar="https://picsum.photos/seed/cine-lover/96/96",
                video_url="football.mp4",
                caption="Aktyorlar kulgudan sahnani tugata olmagan payt. Bu kadrni ko'ring!",
                audio="Comedy Club Tashkent - Bloopers",
                location="Samarkand",
                tags=["bloopers", "comedy", "shorts"],
                likes=0,
                shares=2100,
                views=540000,
            ),
            ShortVideo(
                id="short-3",
                user_id="admin-1",
                author="@moviecuts",
                name="Movie Cuts",
                avatar="https://picsum.photos/seed/movie-cuts/96/96",
                video_url="videoplayback (1).mp4",
                caption="Eng kuchli trailer momentlari bir joyda. Saqlab qo'ying.",
                audio="Epic Trailer Mix",
                location="Bukhara",
                tags=["trailer", "action", "movie"],
                likes=0,
                shares=1600,
                views=276000,
            ),
        ]

        for short in shorts_data:
            db.add(short)

        db.commit()
        print(f"Seeded {len(shorts_data)} shorts")
    except Exception as e:
        print(f"Shorts seeding error: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create tables and seed data on startup."""
    # Create all database tables
    Base.metadata.create_all(bind=engine)
    # Seed initial data
    seed_database()
    seed_shorts()
    print("iMovie.uz Backend is running!")
    print("API Docs: http://localhost:8000/docs")
    yield
    print("Shutting down...")


# ── Create FastAPI app ────────────────────────────────────────────
app = FastAPI(
    title="iMovie.uz API",
    description="Backend API for iMovie.uz — Uzbekistan's premium movie streaming platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS Middleware ───────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include Routers ───────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(movies_router)
app.include_router(comments_router)
app.include_router(users_router)
app.include_router(shorts_router)


# ── Movie streaming with byte range support ───────────────────────
MOVIES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Movies")
MOVIES_DIR_ABS = os.path.abspath(MOVIES_DIR)
SHORTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "shorts")
SHORTS_DIR_ABS = os.path.abspath(SHORTS_DIR)


@app.get("/media/{filename:path}")
def stream_movie(filename: str, request: Request):
    if not os.path.exists(MOVIES_DIR_ABS):
        raise HTTPException(status_code=404, detail="Movies directory not found")

    file_path = resolve_media_path(filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="Movie not found")

    return stream_file_response(file_path, request)


@app.get("/short-videos/{filename:path}")
def stream_short_video(filename: str, request: Request):
    if not os.path.exists(SHORTS_DIR_ABS):
        raise HTTPException(status_code=404, detail="Shorts directory not found")

    file_path = resolve_short_path(filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="Short video not found")

    return stream_file_response(file_path, request)


if os.path.exists(MOVIES_DIR_ABS):
    print(f"Serving movies from: {MOVIES_DIR_ABS}")

if os.path.exists(SHORTS_DIR_ABS):
    print(f"Serving shorts from: {SHORTS_DIR_ABS}")


# ── Root endpoint ─────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "name": "iMovie.uz API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running ✅",
    }



    
