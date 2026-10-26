
## Running the tests

| What | Command (from the repo root) |
|---|---|
| Everything | `bash scripts/test-all.sh` |
| Backend only | `cd backend && ./venv/Scripts/python.exe -m pytest tests/ -q` |
| One file while developing | `cd backend && ./venv/Scripts/python.exe -m pytest tests/test_posts.py -v` |
| Backend without the real Supabase sign-in tests | add `-m "not supabase_auth"` |
| Backend with coverage report | add `--cov=app --cov-report=term-missing:skip-covered --cov-report=html` (open `backend/htmlcov/index.html`) |
| Slowest tests | add `--durations=15` |
| Frontend only | `cd frontend && npm test` |

Backend tests create real users in the Supabase dev project and delete them afterwards, so a full run takes several minutes.
