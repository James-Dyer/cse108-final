# Code Lab
Code Lab is a web app that helps CS students break down programming assignments into summaries, learning objectives, and guided coding steps with built-in hints and feedback.

- Frontend: React + TypeScript (Vite) in `frontend/`
- Backend: Flask API with SQLite in `server/src/app.py`
- LLM: OpenAI models generate overviews, learning objectives, steps, hints, and code feedback

## Prerequisites
- Python 3.11+ and `pip`
- Node.js 18+ and `npm`
- An `OPENAI_API_KEY` (required for the backend)

## Backend setup (Flask)
```bash
cd server
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `server/.env` (or export env vars) with at least:
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini          # optional, defaults shown
JWT_SECRET=dev-secret-change-me   # optional
ALLOWED_ORIGINS=http://localhost:5173
JWT_TTL_MINUTES=1440
# For production (Render) use a managed Postgres DB URL; leave unset locally to use SQLite:
# DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
```

Run the API (defaults to `http://localhost:5001`):
```bash
python src/app.py
```

Run with Gunicorn for deployment (honors `server/gunicorn.conf.py`):
```bash
cd server
gunicorn --config gunicorn.conf.py "src.app:app"
```
Environment overrides: `GUNICORN_BIND` (default `0.0.0.0:5001`), `GUNICORN_WORKERS` (default `2`), `GUNICORN_THREADS` (default `4`), `GUNICORN_TIMEOUT` (default `120`), `GUNICORN_LOGLEVEL` (default `info`).

Render setup:
- Add a Postgres service; Render will inject `DATABASE_URL`—no code changes needed because the app picks it up automatically.
- Add your frontend origin to `ALLOWED_ORIGINS`.
- Start command stays `gunicorn --config gunicorn.conf.py "src.app:app"`.

SQLite lives at `server/src/code_lab.db` and is created/updated automatically on start.

## Frontend setup (Vite)
```bash
cd frontend
npm install
```

Set the API base (defaults to `http://localhost:5000`), e.g. in `frontend/.env`:
```
VITE_API_BASE=http://localhost:5001
```

Start the dev server (http://localhost:5173):
```bash
npm run dev
```

## Development flow
1) Start the Flask API.
2) Start the Vite dev server with `VITE_API_BASE` pointing at the API port.
3) Sign up/login, create an assignment, and walk through overview → objectives → steps → workspace.

## Notes
- API endpoints are under `/api/*` and require a Bearer token after login.
- To reset data locally, stop the server and remove `server/src/code_lab.db` (or wipe tables manually).
- Build the frontend with `npm run build`; backend uses `app.py` directly (no extra process manager included).
