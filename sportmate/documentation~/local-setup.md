   # Local Setup

   ## Supabase
   1. Get added as a collaborator on the `sportmate-dev` and `sportmate-test` Supabase projects.
   2. From Settings → API and Settings → Database, collect your own copies of the project
      URL, anon key, JWT secret, and database connection string.
   3. You will not install Postgres locally — Supabase hosts it.

   ## Backend
   1. `cd backend && python -m venv venv && source venv/bin/activate`
   2. `pip install -r requirements.txt`
   3. Copy `.env.example` to `.env` and fill in your real Supabase values.
   4. `uvicorn app.main:app --reload`

   ## Frontend
   1. `cd frontend && npm install`
   2. Copy `.env.example` to `.env.local` and fill in your real Supabase values.
   3. `npm run dev`