import mimetypes
import uvicorn
import os
import sys
import uuid
import json
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, or_, text

from database import engine, SessionLocal, Base
from models import User, Movie, ShortVideo
from auth import hash_password

from routers.auth_router import router as auth_router
from routers.movies_router import router as movies_router
from routers.comments_router import router as comments_router
from routers.users_router import router as users_router
from routers.shorts_router import router as shorts_router


CHUNK_SIZE = 1024 * 1024
DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist"))
DIST_ASSETS_DIR = os.path.join(DIST_DIR, "assets")
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".mkv", ".avi"}


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



def discover_local_movies() -> list[dict[str, str]]:
    """Discover local movie files in the Movies directory and return metadata.

    This is a fallback for deployment when static movie catalog files are present.
    """
    if not os.path.exists(MOVIES_DIR_ABS):
        return []

    local_movies = []
    for root, _, files in os.walk(MOVIES_DIR_ABS):
        for filename in files:
            _, ext = os.path.splitext(filename)
            if ext.lower() not in VIDEO_EXTENSIONS:
                continue

            relative_path = os.path.relpath(os.path.join(root, filename), MOVIES_DIR_ABS)
            movie_id = os.path.splitext(relative_path.replace(os.sep, "-"))[0]
            local_movies.append({
                "id": movie_id,
                "title_en": os.path.splitext(filename)[0],
                "title_ru": os.path.splitext(filename)[0],
                "title_uz": os.path.splitext(filename)[0],
                "description_en": "Local movie from Movies folder.",
                "description_ru": "Фильм из папки Movies.",
                "description_uz": "Movies papkasidagi mahalliy film.",
                "poster": "/photos/maxresdefault.jpg",
                "backdrop": "/photos/maxresdefault.jpg",
                "video_url": f"/media/{relative_path.replace(os.sep, '/')}",
                "content_type": "movie",
                "episodes": [],
                "year": 2024,
                "genre": ["Drama"],
                "rating": 7.0,
                "duration": "Unknown",
                "country": "Local",
                "is_trending": False,
                "is_new": True,
                "views": 0,
            })
    return local_movies


def seed_database():
    """Upsert seed data so updates apply even if DB already has rows."""
    db = SessionLocal()
    try:
        print("🌱 Seeding/Upserting database...")

        # Upsert admin user
        admin = db.query(User).filter(User.id == "admin-1").first()
        if not admin:
            admin = User(
                id="admin-1",
                name="Super Admin",
                email="admin@imovie.uz",
                hashed_password=hash_password("admin123"),
                avatar="https://picsum.photos/seed/admin/100/100",
                role="admin",
            )
            db.add(admin)
        else:
            admin.name = "Super Admin"
            admin.email = "admin@imovie.uz"
            admin.hashed_password = hash_password("admin123")
            admin.avatar = "https://picsum.photos/seed/admin/100/100"
            admin.role = "admin"

        # Upsert demo user
        demo_user = db.query(User).filter(User.id == "user-demo1").first()
        if not demo_user:
            demo_user = User(
                id="user-demo1",
                name="Demo User",
                email="user@imovie.uz",
                hashed_password=hash_password("user123"),
                avatar="https://picsum.photos/seed/demo/100/100",
                role="user",
            )
            db.add(demo_user)
        else:
            demo_user.name = "Demo User"
            demo_user.email = "user@imovie.uz"
            demo_user.hashed_password = hash_password("user123")
            demo_user.avatar = "https://picsum.photos/seed/demo/100/100"
            demo_user.role = "user"

        # Seed movies (upsert by id)
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
            existing = db.query(Movie).filter(Movie.id == movie.id).first()
            if not existing:
                db.add(movie)
            else:
                # Update all seed fields
                existing.title_en = movie.title_en
                existing.title_ru = movie.title_ru
                existing.title_uz = movie.title_uz
                existing.description_en = movie.description_en
                existing.description_ru = movie.description_ru
                existing.description_uz = movie.description_uz
                existing.poster = movie.poster
                existing.backdrop = movie.backdrop
                existing.video_url = movie.video_url
                existing.content_type = movie.content_type
                existing.episodes = movie.episodes
                existing.year = movie.year
                existing.genre = movie.genre
                existing.rating = movie.rating
                existing.duration = movie.duration
                existing.country = movie.country
                existing.is_trending = movie.is_trending
                existing.is_new = movie.is_new
                existing.views = movie.views

        # Local movie discovery: insert missing only
        local_movie_entries = discover_local_movies()
        for local_data in local_movie_entries:
            if db.query(Movie).filter(Movie.id == local_data["id"]).first():
                continue
            db.add(Movie(**local_data))

        db.commit()
        print("✅ Seed upsert complete")
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
            "short-1": "Movie.mp4",
            "short-2": "football.mp4",
            "short-3": "videoplayback (1).mp4",
        }
        related_movie_ids = {
            "short-1": "282b83943421",
            "short-2": "27bdd5ff1829",
            "short-3": "avengers-local-2",
        }

        if db.query(ShortVideo).count() > 0:
            changed = False
            for short_id, video_url in local_video_urls.items():
                short = db.query(ShortVideo).filter(ShortVideo.id == short_id).first()
                if short and resolve_short_path(video_url) and short.video_url != video_url:
                    short.video_url = video_url
                    changed = True
                movie_id = related_movie_ids.get(short_id)
                if short and movie_id and short.movie_id != movie_id:
                    short.movie_id = movie_id
                    changed = True
            if changed:
                db.commit()
                print("Updated seeded shorts to local video files")
            return

        shorts_data = [
            ShortVideo(
                id="short-1",
                user_id="admin-1",
                movie_id=related_movie_ids["short-1"],
                author="@imovie_official",
                name="iMovie.uz",
                avatar="https://picsum.photos/seed/imovie-official/96/96",
                video_url="Movie.mp4",
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
                movie_id=related_movie_ids["short-2"],
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
                movie_id=related_movie_ids["short-3"],
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


def sync_deployed_content():
    """Replace demo seed movies with the project's current movie catalog."""
    db = SessionLocal()
    try:
        demo_movie_ids = [str(index) for index in range(1, 9)]
        db.query(Movie).filter(Movie.id.in_(demo_movie_ids)).delete(synchronize_session=False)

        movies_data = [
            {
                "id": "27bdd5ff1829",
                "title_en": "Avengers ",
                "title_ru": "Мстители",
                "title_uz": "Qasoskorlar",
                "description_en": "When a dangerous enemy named Loki threatens Earth, Nick Fury brings together Iron Man, Captain America, Thor, Hulk, Black Widow, and Hawkeye to form the Avengers. At first, the heroes struggle to work as a team, but they soon unite to stop a massive alien invasion and save New York City. The movie is full of action, humor, and epic battles.",
                "description_ru": "Когда опасный враг по имени Локи угрожает Земле, Ник Фьюри собирает команду супергероев: Железного человека, Капитана Америку, Тора, Халка, Чёрную вдову и Соколиного глаза. Сначала героям трудно работать вместе, но позже они объединяются, чтобы остановить масштабное вторжение пришельцев и спасти Нью-Йорк. Фильм наполнен экшеном, юмором и зрелищными битвами.",
                "description_uz": "Loki ismli xavfli dushman Yerga tahdid solganda, Nik Fyuri Iron Man, Kapitan Amerika, Tor, Halk, Black Widow va Hawkeye kabi qahramonlarni bir jamoaga yig'adi. Dastlab ular bir-biri bilan chiqisha olmaydi, ammo keyinchalik birlashib, ulkan begona mavjudotlar hujumini to'xtatishga va Nyu-York shahrini saqlab qolishga harakat qilishadi. Film jangovar sahnalar, hazil va epik urushlarga boy.",
                "poster": "https://m.media-amazon.com/images/M/MV5BNGE0YTVjNzUtNzJjOS00NGNlLTgxMzctZTY4YTE1Y2Y1ZTU4XkEyXkFqcGc@._V1_.jpg",
                "backdrop": "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1600&q=80",
                "video_url": video_url_from_env(
                    "MOVIE_AVENGER_URL",
                    "Avenger.mp4",
                    "https://Movie-uz.b-cdn.net/Avenger.mp4",
                ),
                "year": 2012,
                "genre": ["Action"],
                "rating": 0.0,
                "duration": "2h 23 m",
                "country": "USA",
                "is_trending": False,
                "is_new": True,
                "views": 68,
            },
            {
                "id": "282b83943421",
                "title_en": "SocialLink",
                "title_ru": "СоцСвязь",
                "title_uz": "Dastur",
                "description_en": "ConnectMe is a modern social media application where users can create their own profiles, follow each other, like posts, write comments, reply to comments, share content, and save favorite posts. The app is designed to make communication simple, fast, and interactive. Users can connect with friends, discover new people, and manage their personal social space in one platform.",
                "description_ru": "СвяжиМеня - это современное приложение социальной сети, где пользователи могут создавать свои профили, подписываться друг на друга, ставить лайки, писать комментарии, отвечать на комментарии, делиться публикациями и сохранять понравившиеся посты. Приложение создано для удобного, быстрого и интерактивного общения. Пользователи могут находить друзей, знакомиться с новыми людьми и управлять своим личным социальным пространством на одной платформе.",
                "description_uz": "MeniBog'la - bu zamonaviy ijtimoiy tarmoq dasturi bo'lib, unda foydalanuvchilar o'z profilini yaratishi, bir-birini kuzatishi, postlarga layk bosishi, kommentariya yozishi, kommentariyalarga javob berishi, postlarni ulashishi va saqlab qo'yishi mumkin. Dastur muloqotni oson, tez va qiziqarli qilish uchun yaratilgan. Foydalanuvchilar do'stlari bilan bog'lanishi, yangi insonlarni topishi va o'z ijtimoiy sahifasini boshqarishi mumkin.",
                "poster": "https://img.kinochilar.com/uploads/posts/1732659724-2098248055-dastur-kinochilar-com.jpg",
                "backdrop": "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1600&q=80",
                "video_url": video_url_from_env(
                    "MOVIE_DASTUR_URL",
                    "Dastur_720.mp4",
                    "https://Movie-uz.b-cdn.net/Dastur_720.mp4",
                ),
                "year": 2023,
                "genre": ["Fantastic"],
                "rating": 10.0,
                "duration": "1h 41m",
                "country": "Kazakh",
                "is_trending": True,
                "is_new": True,
                "views": 18,
            },
            {
                "id": "avengers-local-2",
                "title_en": "Avengers",
                "title_ru": "Мстители",
                "title_uz": "Qasoskorlar",
                "description_en": "Earth's mightiest heroes assemble to stop a dangerous enemy and protect the world from an alien invasion.",
                "description_ru": "Величайшие герои Земли объединяются, чтобы остановить опасного врага и защитить мир от вторжения пришельцев.",
                "description_uz": "Yerning eng kuchli qahramonlari xavfli dushmanni to'xtatish va dunyoni begona mavjudotlar hujumidan himoya qilish uchun birlashadi.",
                "poster": "/photos/01-avengers-2012.webp",
                "backdrop": "/photos/maxresdefault.jpg",
                "video_url": video_url_from_env(
                    "MOVIE_AVENGERS_URL",
                    "Avengers.mp4",
                    "https://Movie-uz.b-cdn.net/Avengers.mp4",
                ),
                "year": 2012,
                "genre": ["Action", "Adventure"],
                "rating": 8.0,
                "duration": "2h 23m",
                "country": "USA",
                "is_trending": True,
                "is_new": False,
                "views": 0,
            },
        ]

        for data in movies_data:
            movie = db.query(Movie).filter(Movie.id == data["id"]).first()
            if not movie:
                movie = Movie(id=data["id"])
                db.add(movie)
                for field, value in data.items():
                    if field != "id":
                        setattr(movie, field, value)
            elif should_refresh_seed_video_url(movie.video_url):
                movie.video_url = data["video_url"]

        db.commit()
        print(f"Synced {len(movies_data)} deployed movies")
    except Exception as e:
        print(f"Deployed content sync error: {e}")
        db.rollback()
    finally:
        db.close()


def ensure_short_video_movie_id_column():
    inspector = inspect(engine)
    if "short_videos" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("short_videos")}
    if "movie_id" in columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE short_videos ADD COLUMN movie_id VARCHAR"))
    print("Added movie_id column to short_videos")


def ensure_movie_episode_columns():
    inspector = inspect(engine)
    if "movies" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("movies")}
    with engine.begin() as connection:
        if "content_type" not in columns:
            connection.execute(text("ALTER TABLE movies ADD COLUMN content_type VARCHAR DEFAULT 'movie'"))
            print("Added content_type column to movies")
        if "episodes" not in columns:
            connection.execute(text("ALTER TABLE movies ADD COLUMN episodes JSON DEFAULT '[]'"))
            print("Added episodes column to movies")


def ensure_true_education_episodes():
    db = SessionLocal()
    try:
        matches = db.query(Movie).filter(
            or_(
                Movie.title_en.ilike("%true education%"),
                Movie.title_ru.ilike("%true education%"),
                Movie.title_uz.ilike("%true education%"),
                Movie.title_uz.ilike("%haqiqiy%ta%lim%"),
            )
        ).all()

        changed = False
        for movie in matches:
            existing = movie.episodes or []
            if isinstance(existing, str):
                try:
                    existing = json.loads(existing)
                except json.JSONDecodeError:
                    existing = []
            if movie.content_type != "series":
                movie.content_type = "series"
                changed = True
            if len(existing) != 10:
                movie.episodes = [
                    {
                        "number": index,
                        "title": f"{index}-seriya",
                        "videoUrl": (existing[index - 1].get("videoUrl") if index <= len(existing) and isinstance(existing[index - 1], dict) else "") or movie.video_url,
                    }
                    for index in range(1, 11)
                ]
                changed = True

        if changed:
            db.commit()
            print("Ensured True Education has 10 episodes")
    except Exception as e:
        print(f"True Education episode sync error: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: create tables and seed data on startup."""
    # Create all database tables
    Base.metadata.create_all(bind=engine)
    ensure_movie_episode_columns()
    ensure_short_video_movie_id_column()
    # Seed initial data
    seed_database()
    sync_deployed_content()
    ensure_true_education_episodes()
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

if os.path.isdir(DIST_ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=DIST_ASSETS_DIR), name="assets")


# ── Movie streaming with byte range support ───────────────────────
MOVIES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Movies")
MOVIES_DIR_ABS = os.path.abspath(MOVIES_DIR)
SHORTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "shorts")
SHORTS_DIR_ABS = os.path.abspath(SHORTS_DIR)
DEMO_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"


def video_url_from_env(env_name: str, local_filename: str, hosted_default: str | None = None) -> str:
    hosted_url = os.getenv(env_name, "").strip()
    if hosted_url:
        return hosted_url
    if os.getenv("VERCEL") and hosted_default:
        return hosted_default
    return local_filename


def should_refresh_seed_video_url(video_url: str | None) -> bool:
    raw_url = (video_url or "").strip()
    return raw_url in {
        "",
        DEMO_VIDEO_URL,
        "Avenger.mp4",
        "Avengers.mp4",
        "Dastur_720.mp4",
        "/media/Avenger.mp4",
        "/media/Avengers.mp4",
        "/media/Dastur_720.mp4",
    }


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
    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)

    return {
        "name": "iMovie.uz API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running ✅",
    }



    

@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    reserved_prefixes = ("api/", "media/", "short-videos/", "docs", "openapi.json")
    if full_path.startswith(reserved_prefixes):
        raise HTTPException(status_code=404, detail="Not found")

    requested_file = os.path.abspath(os.path.join(DIST_DIR, full_path))
    if requested_file.startswith(DIST_DIR + os.sep) and os.path.isfile(requested_file):
        return FileResponse(requested_file)

    index_path = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)

    raise HTTPException(status_code=404, detail="Frontend build not found")
