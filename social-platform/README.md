# ShortVerse

A modern short-video social media platform scaffold inspired by TikTok and Instagram Reels.

## Stack

- Frontend: React, Vite, Tailwind CSS, Framer Motion, React Router, Axios, Context API
- Backend: Node.js, Express.js, MongoDB, Mongoose, JWT, Socket.io

## Apps

- `frontend`: mobile-first reels UI, auth, profile, upload, comments, sharing
- `backend`: REST API, JWT auth, MongoDB schemas, realtime events

## Quick Start

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## API Surface

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/:token`
- `GET /api/users/me`, `PUT /api/users/me`, `GET /api/users/:id`, `GET /api/users/search`
- `GET /api/videos/feed`, `POST /api/videos`, `GET /api/videos/:id`
- `POST /api/videos/:id/like`, `POST /api/videos/:id/save`, `POST /api/videos/:id/share`
- `GET /api/comments/video/:videoId`, `POST /api/comments/video/:videoId`
- `POST /api/comments/:commentId/replies`, `DELETE /api/comments/:commentId`
- `POST /api/follows/:userId`, `GET /api/follows/followers/:userId`
- `GET /api/notifications`, `PATCH /api/notifications/read`
- `GET /api/admin/dashboard`, `GET /api/admin/users`, `GET /api/admin/videos`

```bash
cd frontend
npm install
npm run dev
```
