# Fireflies Clone — Meeting Notes & Transcription Platform

A full-stack clone of Fireflies.ai's post-meeting workflow: meeting library, interactive transcripts,
AI summaries, action items, and more.

**Live demo:** <your-vercel-url> · **API docs:** <your-render-url>/docs

## Tech stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + lucide-react
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2
- **Database:** SQLite (auto-created and seeded on first start)

## Setup
```bash
# backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend
cd frontend && cp .env.local.example .env.local && npm install && npm run dev
```
Open http://localhost:3000. Swagger docs: http://localhost:8000/docs.

To enable Gemini 2.5 Flash for "Ask AI", copy `backend/.env.example` to `backend/.env` and set `GEMINI_API_KEY` there. The backend loads this file automatically; restart the backend after adding the key. The `.env` file is ignored by Git.

## Architecture
```
Next.js (UI)  ──REST/JSON──▶  FastAPI routers ──▶ services (parser, summarizer, qa, export)
                                   │                          │
                                   └────── SQLAlchemy ORM ────┴──▶ SQLite
```
- **routers/** – thin HTTP layer (validation, status codes)
- **services/** – business logic (transcript parsing, AI notes generation, Q&A, export); swappable for a real LLM
- **models.py / schemas.py** – persistence models vs. API contracts
- Frontend: `lib/api.ts` is the only place that talks to the backend; pages compose small reusable components.

## Database schema
```
users(id, name, email)
meetings(id, user_id→users, title, date, duration_seconds, platform, created_at, updated_at)
participants(id, meeting_id→meetings, name, email)
segments(id, meeting_id→meetings, idx, speaker, start, end, text)       -- transcript turns
summaries(id, meeting_id→meetings UNIQUE, overview, bullets JSON, keywords JSON)
chapters(id, meeting_id→meetings, title, start, summary)
action_items(id, meeting_id→meetings, segment_id→segments?, text, assignee, due_date, completed, created_at)
comments(id, meeting_id→meetings, segment_id→segments?, author, text, created_at)
highlights(id, meeting_id→meetings, segment_id→segments, label, start)  -- soundbites
tags(id, name UNIQUE)   meeting_tags(meeting_id, tag_id)                 -- many-to-many
```
All child tables cascade on meeting delete; foreign keys are enforced (`PRAGMA foreign_keys=ON`).

## API overview
| Method | Path | Purpose |
|---|---|---|
| GET | /api/meetings?q&participant&tag&date_from&date_to&sort | List/filter/sort |
| POST | /api/meetings | Create from pasted transcript |
| POST | /api/meetings/upload | Create from .txt/.vtt/.json upload |
| GET/PATCH/DELETE | /api/meetings/{id} | Detail / edit metadata / delete |
| POST | /api/meetings/{id}/regenerate | Regenerate summary & chapters |
| POST | /api/meetings/{id}/ask | Ask a question about the meeting |
| GET | /api/meetings/{id}/export?format=md\|txt\|json | Export |
| GET | /api/action-items | All tasks across meetings |
| POST | /api/meetings/{id}/action-items | Add task |
| PATCH/DELETE | /api/action-items/{id} | Edit / complete / delete |
| POST/DELETE | /api/meetings/{id}/comments, /api/comments/{id} | Comments |
| POST/DELETE | /api/meetings/{id}/highlights, /api/highlights/{id} | Soundbites |
| GET | /api/search?q= | Global transcript search |
| GET | /api/tags, /api/participants, /api/stats | Filters & analytics |

## Assumptions
- Transcription is out of scope; transcripts are seeded, pasted, or uploaded.
- The player simulates playback with a timer (no audio file needed) so seek ⇄ transcript sync is fully demonstrable.
- A default user (Sanjana Raghunath) is always logged in.
- Summaries are produced by an extractive heuristic summarizer; Ask AI uses an LLM only if an API key is provided.

## Deployment
- **Backend (Render):** root `backend`, build `pip install -r requirements.txt`, start
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, env `CORS_ORIGINS=https://<your-vercel-domain>`.
  (SQLite on free tiers is ephemeral; data re-seeds on restart.)
- **Frontend (Vercel):** root `frontend`, env `NEXT_PUBLIC_API_URL=https://<your-render-domain>`.
