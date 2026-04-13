# MCQ Quiz Platform

Participant quiz app with Express + PostgreSQL backend and React (Vite) frontend. Scores and correct answers are never exposed to participants; admin uses JWT-protected APIs.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Database

Create a database and set `DATABASE_URL` (see backend env).

Example:

```bash
createdb mcq_platform
```

## Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, ADMIN_JWT_SECRET, PORT
npm install
npm start
```

Server default: `http://localhost:5000`

### Environment variables (backend)

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default `5000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_JWT_SECRET` | Secret for signing admin JWTs |

## Frontend setup

```bash
cd frontend
cp .env.example .env
# Optional: VITE_API_URL=http://localhost:5000 (or leave unset in dev to use Vite proxy)
npm install
npm run dev
```

App default: `http://localhost:5173`

Production build:

```bash
cd frontend
npm run build
npm run preview
```

Set `VITE_API_URL` to your public API origin when the frontend is not served from the same host as the API.

## Usage

1. Start PostgreSQL, configure `backend/.env`, run the backend.
2. Run the frontend dev server (or serve `frontend/dist` behind a static host).
3. Open `/admin`, sign in with username `admin` and password `admin*123`, add questions.
4. Participants open `/`, enter team name, name, roll number, take the quiz, submit. They only see “Quiz Submitted Successfully” (no score).

## API summary

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/login` | Body: `teamName`, `participantName`, `rollNo` → `{ userId }` |
| GET | `/api/quiz/questions` | Header: `X-User-Id` → questions **without** `correctAnswer` |
| POST | `/api/quiz/submit` | Body: `userId`, `answers` (object: question id → option index) → success message only |
| POST | `/api/quiz/tab-switch` | Body: `userId` → increments tab switch count |
| POST | `/api/admin/login` | Body: `username`, `password` → `{ token }` (admin only) |
| POST | `/api/admin/add-question` | Header: `Authorization: Bearer <token>`, body: `question`, `options` (4 strings), `correctAnswer` (0–3) |
| GET | `/api/admin/results` | Header: `Authorization: Bearer <token>` → participants with scores |

## Project structure

```
mcq-platform/
├── backend/
├── frontend/
└── README.md
```
