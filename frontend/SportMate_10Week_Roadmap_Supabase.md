# SportMate — 10-Week / 50-Day Full-Stack Development Roadmap (Supabase Edition)

**Team:** 2 developers (Member 1 — Frontend, Member 2 — Backend)
**Duration:** 10 weeks, 50 working days (Mon–Fri)
**Source of truth for features:** SportMate — Complete Product & Technical Architecture

This is a full regeneration of the original roadmap with **Supabase** (managed PostgreSQL +
Auth + Realtime + Storage) baked in throughout, replacing local PostgreSQL installation and
custom-built authentication. No Docker is used anywhere, at any point, including production.

---

## A Note on the Stack

**Division of responsibility:** Supabase provides infrastructure services — hosted
PostgreSQL, authentication, realtime subscriptions, and file storage. **FastAPI implements
SportMate's business logic and the secure API layer**: matchmaking scoring, match lifecycle,
leave-risk rules, waiting lists, court booking (with double-booking protection), venue
approval, and every write that needs validation or authorization beyond "is this a valid
user." FastAPI never touches a password; it verifies the JWT Supabase issues.

Compared to a from-scratch build, this changes:

| Area | Without Supabase | With Supabase |
|---|---|---|
| Postgres | Installed and run natively on the dev machine | Hosted by Supabase (one project = one Postgres instance, per environment) |
| Identity table | Custom `users` + `sessions` tables | `auth.users` (Supabase-managed) + a `profiles` table for app-specific fields (role, avatar, restricted_until) |
| Registration/Login | FastAPI hashes passwords, issues its own JWTs | Supabase Auth handles signup/login/password reset; FastAPI verifies the resulting JWT |
| RBAC | Role stored and checked against custom `users.role` | Role stored and checked against `profiles.role`, same logic otherwise |
| Chat delivery | Polling, WebSocket as a stretch goal | Supabase Realtime (frontend subscribes to `messages` table changes directly) |
| File uploads | Not in original scope | Supabase Storage for venue photos and avatars |
| Production database | A separately hosted/managed PostgreSQL instance | The same Supabase project (or a separate production Supabase project) |

Everything else — the FastAPI business logic, the SQLAlchemy models, the Next.js frontend,
the "no Docker" rule, the Git workflow, and every feature from the architecture document —
is unchanged.

---

## 1. Project Development Strategy

The overall shape of the 10 weeks is the same as a from-scratch build, with the identity
layer and real-time delivery now delegated to Supabase:

- **Weeks 1–3** build the skeleton: repos, tooling, Supabase project setup, database schema,
  and — instead of building auth from scratch — wiring Supabase Auth into both the frontend
  and FastAPI's JWT verification layer, plus RBAC on top of a `profiles` table.
- **Week 4** is backend-heavy: the core match domain (profiles/sports, matches, matchmaking
  scoring, leave-risk, waiting list) as real, tested FastAPI endpoints against Supabase's
  Postgres.
- **Week 5** is frontend-heavy: Member 1 turns those APIs into real screens.
- **Week 6** wires frontend and backend together for real, mock data removed.
- **Week 7** finishes everything else: venues, courts, court booking, chat (now via Supabase
  Realtime), community posts, notifications, and file uploads (Supabase Storage).
- **Weeks 8–9** are quality weeks: testing, security review (including Supabase Row Level
  Security policies), performance, and UX polish.
- **Week 10** is deployment (Supabase project as production database, FastAPI and Next.js
  still deployed natively), documentation, and demo rehearsal.

---

## 2. Team Responsibilities

### Member 1 — Frontend Developer
Owns the Next.js + React + TypeScript + Tailwind CSS application: routing, layouts,
components, forms, frontend state, the Supabase JS client (auth, realtime subscriptions,
storage uploads), the FastAPI API client, loading/error/empty states, responsive design, and
frontend testing.

### Member 2 — Backend Developer
Owns the FastAPI + Python + Pydantic application and its connection to Supabase's PostgreSQL
(SQLAlchemy + Alembic): API endpoints, business logic, JWT verification against Supabase's
secret, RBAC via the `profiles` table, backend testing, and OpenAPI documentation. Also owns
the SQL migrations/policies that live in Supabase itself (tables, RLS policies, the
auth-to-profiles sync trigger).

### Shared
Requirements review, architecture decisions, Supabase project administration, Git/GitHub,
code reviews, API contract design, integration testing, bug fixing, security review
(including RLS policy review), final testing, documentation, deployment, final presentation.

---

## 3. The 50-Day Roadmap

### WEEK 1 — Project Initialization

#### Day 1 — Kickoff, Architecture Review, and Repo Setup
**Objective:** Align both developers on the SportMate architecture and stand up the GitHub repo.
**Member 1 (Frontend):**
- Read the full SportMate architecture document; note all Player-facing screens implied by each feature.
- Draft a first-pass sitemap: `/login`, `/register`, `/dashboard`, `/matches`, `/matches/[id]`, `/venues`, `/bookings`, `/chat/[matchId]`, `/community`, `/admin`.
**Member 2 (Backend):**
- Read the architecture document; list every entity from Section 18, **adapted for Supabase**: identity lives in `auth.users` (Supabase-managed) plus a `profiles` table for app fields, instead of a custom `users`/`sessions` pair. All other entities (`user_sports`, `matches`, `match_players`, `waiting_list`, `match_leaves`, `venues`, `courts`, `bookings`, `conversations`, `conversation_members`, `messages`, `posts`, `comments`, `post_likes`, `notifications`, `security_logs`) are unchanged.
- Draft a first-pass ERD with `profiles` as the identity hub referencing `auth.users.id`.
**Shared Team Tasks:**
- Create the GitHub repository with `main` and `develop` branches.
- Agree on branch naming (`feature/frontend-*`, `feature/backend-*`, `feature/database-*`) and commit convention (Conventional Commits: `feat:`, `fix:`, `chore:`).
- Create the top-level folder structure: `frontend/`, `backend/`, `documentation/`.
- Write the initial `README.md`, noting the stack includes Supabase (Postgres + Auth + Realtime + Storage) and that no Docker is used anywhere.
**Deliverables:** GitHub repo with branch protection on `main`; sitemap draft; ERD draft (Supabase-aware); README.
**Testing / Validation:** N/A (planning day) — confirm both members can push/pull from the repo.
**Dependencies:** None.
**Definition of Done:** Repo exists with both members as collaborators, `develop` branch created, README committed, sitemap and ERD drafts shared in `documentation/`.

#### Day 2 — Frontend/Backend Scaffolding and Supabase Project Creation
**Objective:** Get empty Next.js and FastAPI apps running locally, and stand up the Supabase projects that will back the whole system.
**Member 1 (Frontend):**
- `npx create-next-app@latest frontend --typescript --tailwind --app`; verify `npm run dev` serves the default page.
- Strip boilerplate; set up a minimal `app/layout.tsx` shell.
- Install `@supabase/supabase-js` (this replaces `axios`/a custom auth wrapper as the primary tool for identity — you'll still want plain `fetch` for calling your own FastAPI endpoints).
**Member 2 (Backend):**
- Create `backend/` folder, `python -m venv venv`, activate it.
- `pip install fastapi "uvicorn[standard]" pydantic pydantic-settings sqlalchemy alembic psycopg2-binary python-dotenv "python-jose[cryptography]"` (no `passlib` — Supabase hashes passwords, not FastAPI); freeze to `requirements.txt`.
- Create `backend/app/main.py` with a FastAPI instance and a `/health` endpoint.
- Run `uvicorn app.main:app --reload` and confirm `/health` and `/docs` work.
**Shared Team Tasks:**
- Create a **`sportmate-dev`** Supabase project and a separate **`sportmate-test`** Supabase project at supabase.com — this replaces "install PostgreSQL, create two local databases." Note down (don't commit) each project's URL, anon key, JWT secret, and database connection string from Settings → API and Settings → Database.
- Add `.gitignore` entries: `node_modules/`, `venv/`, `__pycache__/`, `.env`, `.env.local`.
- Commit both scaffolds to `develop` via reviewed PRs.
**Deliverables:** Running Next.js and FastAPI dev servers; two Supabase projects provisioned.
**Testing / Validation:** Hit `http://localhost:3000` and `http://localhost:8000/health`; confirm both return expected output; confirm both Supabase project dashboards load.
**Dependencies:** Day 1.
**Definition of Done:** Both dev servers run without errors; `sportmate-dev` and `sportmate-test` Supabase projects exist with both developers as collaborators; PRs merged into `develop`.

#### Day 3 — Connect Both Apps to Supabase and Create the `profiles` Table
**Objective:** Wire frontend and backend to Supabase — no local PostgreSQL install needed.
**Member 1 (Frontend):**
- Create `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from the `sportmate-dev` project).
- Create `frontend/lib/supabaseClient.ts` (Supabase JS client, for auth/realtime/storage) and `frontend/lib/apiClient.ts` (a plain `fetch` wrapper, for calling FastAPI).
**Member 2 (Backend):**
- Create `backend/.env` with `DATABASE_URL` (Supabase's connection string), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`.
- Create `backend/app/core/config.py` (`pydantic-settings`) loading those four values.
- Create `backend/app/db/session.py` with a SQLAlchemy `engine`/`SessionLocal` pointed at Supabase's Postgres, and a `get_db` dependency (identical code to a local setup — only the connection string differs).
- Add a temporary `GET /health/db` endpoint running `SELECT 1` through the engine.
**Shared Team Tasks:**
- In the Supabase SQL Editor for `sportmate-dev`, create the `profiles` table:
  ```sql
  create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text not null,
    role text not null check (role in ('PLAYER', 'VENUE_OWNER', 'ADMIN')),
    avatar text,
    restricted_until timestamptz,
    last_seen_at timestamptz,
    created_at timestamptz default now()
  );
  ```
  Repeat for `sportmate-test`.
- Write `documentation/local-setup.md` covering: getting added to the Supabase projects, collecting env values, and running both apps — explicitly noting no local Postgres install is needed.
- Agree on `.env.example` files (placeholders only) for both apps and commit them.
**Deliverables:** `GET /health/db` succeeds against Supabase's Postgres; `profiles` table exists in both Supabase projects; `.env.example` files committed; setup doc committed.
**Testing / Validation:** `curl http://localhost:8000/health/db` returns `{"db_status":"ok","result":1}`.
**Dependencies:** Day 2.
**Definition of Done:** FastAPI can query Supabase's Postgres without error; `.env.example` files (no secrets) committed; `local-setup.md` committed.

#### Day 4 — CORS, Supabase Auth Smoke Test, and Conventions
**Objective:** Prove the full "Supabase issues the token, FastAPI verifies it" chain works, and lock in shared conventions.
**Member 1 (Frontend):**
- Build a minimal sign-up/sign-in test page using `supabase.auth.signUp()` / `supabase.auth.signInWithPassword()`; on sign-in, call a new FastAPI test endpoint with the resulting access token and display the response.
- Set up ESLint + Prettier; run once to confirm clean output.
**Member 2 (Backend):**
- Add `CORSMiddleware` allowing `http://localhost:3000` with credentials.
- Build `backend/app/core/security.py` with a `get_current_user` dependency that verifies the `Authorization: Bearer <token>` header against `SUPABASE_JWT_SECRET` using `python-jose`, and add a protected `GET /api/v1/me` endpoint returning the decoded user id/email.
- Set up `black`, `isort`, `ruff`; run once to confirm clean output.
- Draft API conventions doc, including the auth contract: every protected endpoint expects a Supabase access token in the `Authorization` header; FastAPI never issues or stores its own tokens.
**Shared Team Tasks:**
- Run the full smoke test together: sign up → sign in → confirm `/api/v1/me` independently verifies the token and returns the correct user.
- Agree on database conventions (snake_case, UUID `id` primary keys, `created_at`/`updated_at`, identity via `auth.users`/`profiles`) and coding conventions; commit both docs.
**Deliverables:** Working end-to-end Supabase Auth → FastAPI verification chain; linting configured; conventions docs committed.
**Testing / Validation:** Sign up and sign in through the UI; confirm `/api/v1/me` returns the correct user id and email with no CORS errors in the console.
**Dependencies:** Days 2–3.
**Definition of Done:** A user can sign up and sign in via Supabase from the frontend, and FastAPI independently verifies their token and identifies them correctly; linters pass; conventions merged.

#### Day 5 — Week 1 Wrap-Up and Architecture Sign-Off
**Objective:** Confirm the full stack (including Supabase) boots cleanly end-to-end and lock the ERD.
**Member 1 (Frontend):**
- Build the global layout shell: header, placeholder nav links for Matches / Venues / Community / Profile, empty footer.
- Set up a `components/` folder convention and one real reusable component (e.g. `Button.tsx`).
**Member 2 (Backend):**
- Finalize the ERD from Day 1 into a reviewed diagram — `profiles` (referencing `auth.users`) as the hub, all other entities as in the architecture doc.
- Set up Alembic (`alembic init`); confirm `alembic revision`/`alembic upgrade head` run cleanly against `sportmate-dev`'s connection string (Alembic manages your *application* tables — `matches`, `venues`, etc. — while `profiles` and any RLS-related SQL are managed directly in Supabase's SQL editor since they interact with Supabase-specific features like `auth.users`).
**Shared Team Tasks:**
- Walk through the ERD together; confirm it matches Section 17's relationships, with `profiles` substituted for the old `users`/`sessions`.
- Retrospective for Week 1.
**Deliverables:** Reviewed, signed-off ERD; working Alembic pipeline against Supabase; global frontend layout shell.
**Testing / Validation:** `alembic upgrade head` runs against `sportmate-dev` with no errors.
**Dependencies:** Days 1–4.
**Definition of Done — Week 1 exit criteria:**
```
Next.js    → running, Supabase Auth smoke test passes
FastAPI    → running, verifies Supabase JWTs correctly
Supabase   → dev + test projects live, profiles table created
Alembic    → migration pipeline functional against Supabase Postgres
Git        → branches/conventions documented
```

---

### WEEK 2 — Database and Backend Foundation

#### Day 6 — Core Domain Tables: Sports, Matches, Waiting List, Leaves
**Objective:** Model the match domain (identity is already handled by `auth.users`/`profiles`).
**Member 1 (Frontend):**
- Build the `app/(auth)/` route group shell: `login/page.tsx` and `register/page.tsx` with titles only (real Supabase-backed forms come in Week 3).
- Set up global Tailwind theme tokens in `tailwind.config.ts`.
**Member 2 (Backend):**
- Create SQLAlchemy models: `UserSport` (id, user_id → `profiles.id`, sport, skill_level), `Match`, `MatchPlayer`, `WaitingList`, `MatchLeave`, per Section 18's field lists.
- Note: `user_id`/`created_by`/similar foreign keys reference `profiles.id`, which itself references `auth.users.id` — SQLAlchemy models don't need a `User` class since that identity table lives outside Alembic's management (it's Supabase's).
- Generate and run the Alembic migration.
**Shared Team Tasks:**
- Review the models together against Section 18's field list.
**Deliverables:** Match-domain tables live in `sportmate-dev`.
**Testing / Validation:** Manually insert a test row into `user_sports` referencing a real `profiles.id` (from Day 4's smoke-test signup) and confirm the FK holds.
**Dependencies:** Day 5.
**Definition of Done:** Migration applies cleanly; a `user_sports` row correctly references a real Supabase-authenticated user via `profiles`.

#### Day 7 — Venue and Booking Tables
**Objective:** Model venues, courts, bookings.
**Member 1 (Frontend):**
- Build the global nav component, switching links based on a (mocked, static for now) role — real role-awareness comes once RBAC is wired in Week 3.
**Member 2 (Backend):**
- Create SQLAlchemy models: `Venue`, `Court`, `Booking` per Section 18.
- Define enums: match status (`OPEN`, `FULL`, `READY`, `CONFIRMED`, `COMPLETED`, `CANCELLED`), venue status (`PAYMENT_PENDING`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`).
- Generate and run the Alembic migration.
**Shared Team Tasks:**
- Cross-check foreign keys against Section 17's relationship diagram.
**Deliverables:** Venue/court/booking tables live in `sportmate-dev`.
**Testing / Validation:** Insert a test `Venue` + `Court` + `Booking` chain to confirm FK integrity.
**Dependencies:** Day 6.
**Definition of Done:** Migration applies cleanly; FK constraints reject an orphaned `Booking`.

#### Day 8 — Chat, Community, and System Tables
**Objective:** Finish the schema.
**Member 1 (Frontend):**
- Build shared `Card`, `Badge`, and `EmptyState` components in `components/ui/`.
**Member 2 (Backend):**
- Create SQLAlchemy models: `Conversation`, `ConversationMember`, `Message`, `Post`, `Comment`, `PostLike`, `Notification`, `SecurityLog`.
- Generate and run the Alembic migration.
- Write `backend/app/db/seed.py` inserting demo `user_sports`, matches, venues/courts — referencing `profiles.id` values for a few test accounts you sign up via the Day 4 smoke-test flow (or via the Supabase dashboard's Authentication → Users → "Add user").
**Shared Team Tasks:**
- Run the seed script together; browse the data in Supabase's Table Editor to sanity-check relationships.
**Deliverables:** Full schema live in `sportmate-dev`; working seed script.
**Testing / Validation:** Confirm seeded rows are correctly related, including to real `profiles`/`auth.users` rows.
**Dependencies:** Days 6–7.
**Definition of Done:** Entire application schema exists; seed script populates realistic demo data tied to real Supabase-authenticated accounts.

#### Day 9 — Pydantic Schemas and Repository Layer Skeleton
**Objective:** Set up the reusable validation and data-access layer.
**Member 1 (Frontend):**
- Build a `types/` folder with TypeScript interfaces mirroring planned backend response shapes (Match, Venue, Booking, Profile).
**Member 2 (Backend):**
- Create `backend/app/schemas/` with the `*Create`/`*Read`/`*Update` Pydantic pattern, starting with `ProfileRead`/`ProfileUpdate` (no `ProfileCreate` — profiles are created by the auth-sync trigger built in Week 3, not directly by the API).
- Create `backend/app/repositories/` skeleton with a generic base repository.
- Wire `app/api/v1/` router skeleton with an empty `profiles` router mounted at `/api/v1/profiles`.
**Shared Team Tasks:**
- Review the `ProfileRead` schema together; confirm it excludes anything sensitive.
**Deliverables:** Schema pattern established; repository base class; empty `profiles` router visible in `/docs`.
**Testing / Validation:** Load `/docs`, confirm the `profiles` router section appears.
**Dependencies:** Day 8.
**Definition of Done:** Schema/repository pattern documented; `/docs` shows the mounted (empty) `profiles` router.

#### Day 10 — Week 2 Wrap-Up: Frontend Shell + Backend Error Handling
**Objective:** Close out the foundation phase.
**Member 1 (Frontend):**
- Finish page skeletons for `/dashboard`, `/matches`, `/venues`, `/community`, `/bookings`, `/admin` — each rendering a title and `EmptyState`, wired into nav.
**Member 2 (Backend):**
- Build a global FastAPI exception handler returning a consistent `{"detail": "..."}` shape for 422/404/500.
- Add structured request logging.
**Shared Team Tasks:**
- Walk through the whole frontend shell together.
- Retrospective for Week 2.
**Deliverables:** Fully navigable (empty) frontend shell; consistent error handling; request logging.
**Testing / Validation:** Trigger a 404 and a validation error against a test endpoint; confirm consistent JSON shape.
**Dependencies:** Days 6–9.
**Definition of Done — Week 2 exit criteria:**
```
Database   → all application tables created in Supabase, seed data loads
Schemas    → Create/Read/Update Pydantic pattern established
Repository → base CRUD pattern established
Frontend   → every top-level route renders a real (empty) page
Backend    → consistent error responses + logging in place
```

---

### WEEK 3 — Supabase Auth Integration and RBAC

#### Day 11 — Real Registration and Login UI via Supabase Auth
**Objective:** Replace the Day 4 smoke test with real, polished registration/login screens.
**Member 1 (Frontend):**
- Build the real registration form (`/register`): email, name, password, password confirmation, account type selector (Player / Venue Owner), calling `supabase.auth.signUp({ email, password, options: { data: { name, role } } })` — passing `name`/`role` as user metadata so the sync trigger (built today by Member 2) can use them.
- Build the real login form (`/login`) calling `supabase.auth.signInWithPassword()`.
- Add client-side validation (required fields, email format, password length) with inline errors.
**Member 2 (Backend):**
- In the Supabase SQL Editor, create a trigger that inserts a `profiles` row whenever a new `auth.users` row is created, reading `name`/`role` from the signup metadata:
  ```sql
  create or replace function public.handle_new_user()
  returns trigger as $$
  begin
    insert into public.profiles (id, name, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', ''),
      coalesce(new.raw_user_meta_data->>'role', 'PLAYER')
    );
    return new;
  end;
  $$ language plpgsql security definer;

  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
  ```
  Apply this in both `sportmate-dev` and `sportmate-test`.
**Shared Team Tasks:**
- Test together: sign up a new Player and a new Venue Owner through the real UI; confirm a matching `profiles` row appears automatically with the correct `role`.
**Deliverables:** Real registration/login UI; working auth-to-profiles sync trigger.
**Testing / Validation:** Sign up through the UI; check Supabase's Table Editor to confirm the `profiles` row was created with correct `name`/`role`.
**Dependencies:** Day 4 smoke test.
**Definition of Done:** Every new signup automatically produces a correctly-populated `profiles` row with no manual step.

#### Day 12 — `get_current_user` Hardening and `GET /api/v1/profiles/me`
**Objective:** Make the JWT verification dependency production-quality and expose the current user's profile.
**Member 1 (Frontend):**
- Handle Supabase auth errors gracefully in the UI (wrong password, unconfirmed email, duplicate signup) with clear inline messages.
**Member 2 (Backend):**
- Harden `get_current_user` (from Day 4): handle expired tokens, malformed headers, and missing `sub` claims with clear 401s; add unit tests for each failure mode.
- Implement `GET /api/v1/profiles/me`: verifies the token, then fetches the matching `profiles` row by `id = token.sub`, returning 404 if somehow missing (shouldn't happen given the trigger, but handle it defensively).
- Implement `PATCH /api/v1/profiles/me` for updating `name`/`avatar` (not `role` — role changes are admin-only, built later).
**Shared Team Tasks:**
- Agree on the token-refresh strategy: the Supabase JS client auto-refreshes sessions; confirm the frontend always sends the *current* access token, not a stale one, on each API call.
**Deliverables:** Hardened `get_current_user`; working `GET`/`PATCH /api/v1/profiles/me`.
**Testing / Validation:** Call `/api/v1/profiles/me` with an expired/malformed token and confirm clean 401s; call it with a valid token and confirm correct profile data.
**Dependencies:** Day 11.
**Definition of Done:** All JWT failure modes return clean 401s (never 500s); `/api/v1/profiles/me` correctly reflects the signed-in user's data.

#### Day 13 — RBAC Middleware and Protected Endpoints
**Objective:** Enforce role-based access control using `profiles.role`.
**Member 1 (Frontend):**
- Connect the login form fully; on success, redirect to `/dashboard`.
**Member 2 (Backend):**
- Build `require_role(*roles)`, wrapping `get_current_user`, fetching the caller's `profiles.role`, and raising 403 if it's not in the allowed set.
- Apply it to placeholder endpoints: `GET /api/v1/admin/ping` (Admin-only), `GET /api/v1/venues/ping` (Venue Owner-only).
**Shared Team Tasks:**
- Test all three roles against both endpoints; confirm 403/200 behavior is correct.
**Deliverables:** Login connected end-to-end; RBAC dependency proven.
**Testing / Validation:** Call the admin-only endpoint as a Player (expect 403) and as an Admin (expect 200).
**Dependencies:** Day 12.
**Definition of Done:** A logged-in Player reaches `/dashboard`; RBAC correctly blocks/allows all three roles.

#### Day 14 — Frontend Auth State, Protected Routes, Role-Aware Nav
**Objective:** Make the frontend fully aware of the Supabase session and the user's role.
**Member 1 (Frontend):**
- Build an `AuthContext`/`useAuth` hook using `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()` to track the live session; fetch the profile (including `role`) via `GET /api/v1/profiles/me` once authenticated.
- Guard protected routes (`/dashboard`, `/matches`, `/bookings`, `/admin`), redirecting unauthenticated users to `/login`.
- Update nav to show role-appropriate links using the real `role` from the profile.
**Member 2 (Backend):**
- Add `POST /api/v1/auth/logout`... actually, logout is a pure frontend action here (`supabase.auth.signOut()`) — instead, spend today writing OpenAPI summaries/descriptions for all Week 3 endpoints so `/docs` is self-explanatory.
**Shared Team Tasks:**
- Full manual walkthrough: register → auto-confirm profile creation → login → dashboard → role-correct nav → `supabase.auth.signOut()` → redirected to `/login`.
**Deliverables:** Working `AuthContext`; protected route guards; role-aware nav; documented endpoints.
**Testing / Validation:** Full register→login→logout loop for all three roles.
**Dependencies:** Days 11–13.
**Definition of Done:** Unauthenticated users are redirected from protected routes; nav reflects real role; sign-out clears session and redirects.

#### Day 15 — Week 3 Wrap-Up: RLS Review, Edge Cases, Milestone Review
**Objective:** Confirm auth is genuinely secure before building on top of it, and review Supabase's Row Level Security implications.
**Member 1 (Frontend):**
- Add loading spinners to auth forms; polish error copy for common Supabase Auth errors (unconfirmed email, rate-limited signup attempts).
**Member 2 (Backend):**
- Review Row Level Security (RLS) status on every Supabase table: since FastAPI connects with the full database connection string (not the anon key), it bypasses RLS by default — **decide and document** which tables the frontend will ever query directly via `supabase-js` (expected: none for now, except a future Realtime subscription on `messages` in Week 7) and ensure RLS is **enabled and locked down** on those, even though most tables are only ever touched through FastAPI.
- Enable RLS on the `profiles` table specifically, with a policy allowing users to read/update only their own row directly (defense in depth, even though the primary path is through FastAPI):
  ```sql
  alter table profiles enable row level security;

  create policy "Users can view own profile"
    on profiles for select
    using (auth.uid() = id);

  create policy "Users can update own profile"
    on profiles for update
    using (auth.uid() = id);
  ```
**Shared Team Tasks:**
- Demo the complete auth flow across all three roles.
- Retrospective for Week 3.
**Deliverables:** Polished auth UX; documented RLS decisions; RLS enabled on `profiles`.
**Testing / Validation:** Confirm `/docs` is complete for all Week 3 endpoints; confirm RLS policy allows a user to read their own profile via the Supabase client and blocks reading others' (test manually with two accounts).
**Dependencies:** Days 11–14.
**Definition of Done — Week 3 exit criteria:**
```
Registration → Supabase Auth signup, auto-creates profiles row
Login        → Supabase session, FastAPI verifies JWT correctly
RBAC         → Player/Venue Owner/Admin correctly gated via profiles.role
RLS          → enabled and reviewed on profiles; policy documented
Frontend     → protected routes + role-aware nav functional
```

---

### WEEK 4 — Core Backend Development

*(Unchanged from a from-scratch build — this week is pure business logic in FastAPI against
Supabase's Postgres, and doesn't touch Supabase Auth/Realtime/Storage directly.)*

#### Day 16 — Player Profile & Sports Endpoints
**Objective:** Let players manage their sports/skill levels.
**Member 1 (Frontend):** Build out the `/dashboard` layout; build a static (unconnected) profile page mock showing sports/skill levels.
**Member 2 (Backend):** Implement `GET/POST/PATCH/DELETE /api/v1/profiles/me/sports`, scoped to the current user via `get_current_user`; validate `skill_level` against a fixed enum.
**Shared Team Tasks:** Confirm sport/skill_level enum values, since they feed the matchmaking algorithm.
**Deliverables:** Working sports CRUD API; dashboard layout; static profile mock.
**Testing / Validation:** Add/update/delete a sport for the current user via `/docs`; confirm persistence.
**Dependencies:** Day 14.
**Definition of Done:** A user can have multiple `user_sports` rows; invalid skill_level rejected with 422.

#### Day 17 — Match Model CRUD (Create, List, Detail)
**Objective:** Implement the basic match resource.
**Member 1 (Frontend):** Build match list (`/matches`) and detail (`/matches/[id]`) UI shells with mock data.
**Member 2 (Backend):** Implement `POST/GET /api/v1/matches`, `GET /api/v1/matches/{id}` with sport/date filters and pagination.
**Shared Team Tasks:** Agree on the pagination contract as the standard for all future list endpoints.
**Deliverables:** Working match create/list/detail endpoints; static UI shells.
**Testing / Validation:** Create three test matches; confirm filtering works.
**Dependencies:** Day 16.
**Definition of Done:** Filtering and detail retrieval work correctly.

#### Day 18 — Match Join / Leave and Lifecycle Transitions
**Objective:** Implement the match lifecycle state machine.
**Member 1 (Frontend):** Build the create-match form UI (unconnected).
**Member 2 (Backend):** Implement `POST /api/v1/matches/{id}/join`/`leave`, automatic status transitions, and creator-only cancel.
**Shared Team Tasks:** Walk through the lifecycle diagram together, confirm exact match.
**Deliverables:** Working join/leave endpoints with correct transitions.
**Testing / Validation:** Fill a match with two seeded users; confirm auto-transition; confirm a third join is rejected.
**Dependencies:** Day 17.
**Definition of Done:** Status transitions correctly and automatically; over-capacity joins clearly rejected.

#### Day 19 — Matchmaking Scoring Algorithm
**Objective:** Implement the weighted matchmaking score.
**Member 1 (Frontend):** Build the matchmaking search UI (unconnected) with score display.
**Member 2 (Backend):** Implement `GET /api/v1/matches/recommended` with Sport 30% / Skill 25% / Availability 20% / Location 15% / Reliability 10% weighting, each factor unit-testable independently.
**Shared Team Tasks:** Hand-calculate expected scores for 2–3 test scenarios and confirm the endpoint matches.
**Deliverables:** Working matchmaking scoring endpoint; unconnected UI.
**Testing / Validation:** Confirm top-ranked result is genuinely the best fit for seeded data.
**Dependencies:** Days 16–18.
**Definition of Done:** Results sorted descending by score; each sub-score factor unit-tested.

#### Day 20 — Leave-Risk Rules, Waiting List Backend, and Week 4 Review
**Objective:** Implement leave-risk classification and waiting-list replacement.
**Member 1 (Frontend):** Finalize the dashboard's "my matches" widget; set up typed API client wrappers for this week's endpoints.
**Member 2 (Backend):** Implement risk classification on leave (`NORMAL`/`WARNING`/`HIGH_RISK`/`CRITICAL`), `CRITICAL` sets `profiles.restricted_until = now + 3 days`; implement waiting-list promotion and a 30-minute expiry background job.
**Shared Team Tasks:** Week 4 demo of the full create→join→leave→waiting-list flow; retrospective.
**Deliverables:** Working leave-risk and waiting-list logic; typed frontend API client.
**Testing / Validation:** Test all four risk tiers; confirm `restricted_until` set correctly; confirm expiry promotes the next user.
**Dependencies:** Days 16–19.
**Definition of Done — Week 4 exit criteria:**
```
Profiles      → sports CRUD working
Matches       → create/list/detail/join/leave working, lifecycle correct
Matchmaking   → weighted scoring endpoint working, unit-tested
Leave-risk    → all four tiers correctly classified
Waiting list  → promotion + 30-minute expiry working
```

---

### WEEK 5 — Core Frontend Development

*(Unchanged from a from-scratch build — wiring the match domain UI to already-built FastAPI
endpoints; auth plumbing from Week 3 is what makes "the current user" available throughout.)*

#### Day 21 — Profile & Sports UI, Live
**Member 1 (Frontend):** Connect profile page to sports CRUD endpoints; handle loading/error/empty states.
**Member 2 (Backend):** pytest coverage for sports CRUD edge cases; fix bugs found during integration.
**Shared Team Tasks:** Pair-test edge cases together.
**Deliverables:** Fully functional profile/sports screen.
**Testing / Validation:** Add/edit/delete a sport in the running app; confirm persistence after refresh.
**Dependencies:** Day 16, Day 14.
**Definition of Done:** Full sports management through the UI, no console errors.

#### Day 22 — Match List, Detail, Create UI, Live
**Member 1 (Frontend):** Connect match list/detail/create to real endpoints; handle loading/error/empty states.
**Member 2 (Backend):** pytest coverage for match create/list/detail; support additional query params as needed.
**Shared Team Tasks:** Create a match through the UI together, confirm it appears correctly everywhere.
**Deliverables:** Fully functional match browse/detail/create flow.
**Testing / Validation:** Create, filter, and view a match end-to-end through the UI.
**Dependencies:** Day 17, Day 14.
**Definition of Done:** Full browse/filter/create/view flow works.

#### Day 23 — Join/Leave UI with Leave-Risk Warnings
**Member 1 (Frontend):** Wire Join/Leave buttons; show risk-tier warning before leave, requiring confirmation for HIGH_RISK/CRITICAL.
**Member 2 (Backend):** pytest coverage for lifecycle transitions; add `GET /matches/{id}/leave-risk-preview` for backend-verified pre-submit warnings; guard `/join` against `restricted_until` users.
**Shared Team Tasks:** Test the critical-leave path together end-to-end.
**Deliverables:** Working, backend-verified risk warnings in the UI.
**Testing / Validation:** Trigger all four risk tiers through the UI.
**Dependencies:** Day 20, Day 22.
**Definition of Done:** Critical leave requires confirmation, correctly restricts the user, and is enforced server-side.

#### Day 24 — Matchmaking Results UI
**Member 1 (Frontend):** Connect matchmaking filters to `/matches/recommended`; render ranked, scored results.
**Member 2 (Backend):** Add pagination/threshold params as needed; pytest coverage confirming ranking correctness.
**Shared Team Tasks:** Sanity-check top results for a couple of manual searches.
**Deliverables:** Fully functional matchmaking search screen.
**Testing / Validation:** Search with varied filters, confirm sensible reordering.
**Dependencies:** Day 19.
**Definition of Done:** Ranked, scored results with correct loading/empty states.

#### Day 25 — Waiting List UI and Week 5 Wrap-Up
**Member 1 (Frontend):** Build "Join Waiting List" and "You've been selected!" (countdown + Accept/Decline) UI.
**Member 2 (Backend):** Implement `POST /matches/{id}/waiting-list` and `POST /waiting-list/{id}/accept`; pytest coverage for accept and timeout paths.
**Shared Team Tasks:** Full Week 5 demo: fill → waitlist → leave → notify → accept, live. Retrospective.
**Deliverables:** Fully functional waiting-list UI.
**Testing / Validation:** Manually run the fill→leave→notify→accept flow end-to-end.
**Dependencies:** Days 20, 23.
**Definition of Done — Week 5 exit criteria:**
```
Profile        → live and functional
Matches        → browse/create/join/leave live and functional
Matchmaking    → live, scored, ranked results
Leave-risk     → warnings shown and enforced
Waiting list   → join/notify/accept flow functional end-to-end
```

---

### WEEK 6 — Frontend + Backend Integration

*(Unchanged from a from-scratch build in structure; Day 26 now also covers Supabase-session
edge cases specifically.)*

#### Day 26 — Full Auth Flow Regression (Including Session Refresh)
**Objective:** Re-verify the entire auth flow, including Supabase-specific session behavior, now that more of the app exists.
**Member 1 (Frontend):** Regression-test registration, login, logout, and protected-route redirects across all three roles; specifically test what happens when a Supabase session expires mid-use (the client should auto-refresh; confirm API calls don't silently fail with a stale token).
**Member 2 (Backend):** Regression-test JWT verification against the current schema; confirm token expiry is handled correctly and consistently.
**Shared Team Tasks:** Pair-test cross-role access attempts on every protected route/endpoint; confirm all are correctly denied.
**Deliverables:** Auth regression report, bugs fixed same-day.
**Testing / Validation:** Attempt cross-role access on every protected route/endpoint; simulate a near-expired session and confirm auto-refresh keeps API calls working.
**Dependencies:** Weeks 3–5.
**Definition of Done:** No role can access another's protected resources; session refresh doesn't break API calls.

#### Day 27 — Match Creation/Join Full Integration Pass
**Member 1 (Frontend):** Remove leftover mock data from match screens.
**Member 2 (Backend):** Audit for race conditions in match-filling (simultaneous joins on the last slot); add a DB-level constraint or transaction lock if missing.
**Shared Team Tasks:** Run the full user journey together.
**Deliverables:** Match flow free of mock data; race condition fixed and tested.
**Testing / Validation:** Simulate two near-simultaneous join requests; confirm only one succeeds.
**Dependencies:** Days 17–25.
**Definition of Done:** No mock data remains; race condition provably handled.

#### Day 28 — Matchmaking End-to-End Integration
**Member 1 (Frontend):** Fix UI bugs for matchmaking edge cases (ties, zero results).
**Member 2 (Backend):** Expand seed data; profile and fix N+1 queries in `/matches/recommended`.
**Shared Team Tasks:** Review real matchmaking searches against expanded data.
**Deliverables:** Matchmaking verified against realistic data; query inefficiencies fixed.
**Testing / Validation:** Time the endpoint before/after the fix.
**Dependencies:** Day 19, Day 24.
**Definition of Done:** Sensible results at realistic scale; no N+1 patterns in the hot path.

#### Day 29 — Leave-Risk & Waiting-List End-to-End Integration
**Member 1 (Frontend):** Fix countdown-timer drift by syncing against server-provided `expires_at`.
**Member 2 (Backend):** Stress-test the expiry job with simultaneous expirations; confirm restriction lift after 3 days works correctly.
**Shared Team Tasks:** Run the full scripted critical-leave-and-replacement scenario together.
**Deliverables:** Verified, bug-fixed leave-risk/waiting-list flow.
**Testing / Validation:** Full scripted scenario with multiple waiting-list entrants.
**Dependencies:** Days 20, 23, 25.
**Definition of Done:** Correct final state across restriction, notification, and promotion.

#### Day 30 — Week 6 Full Regression and Milestone Sign-Off
**Member 1 (Frontend):** Full manual click-through, noting console errors/broken states.
**Member 2 (Backend):** Full pass through `/docs` for accuracy against actual frontend usage.
**Shared Team Tasks:** Joint bug bash (Critical/High/Medium/Low); fix all Critical same-day. Retrospective.
**Deliverables:** Bug list; Critical issues fixed; core product confirmed stable.
**Testing / Validation:** Every screen loads without console errors; every core flow works end-to-end.
**Dependencies:** Weeks 1–6.
**Definition of Done — Week 6 exit criteria:**
```
Core product (auth, profile, matches, matchmaking,
leave-risk, waiting list) → fully integrated, no mock data,
no known Critical bugs, contract-consistent frontend/backend.
```

---

### WEEK 7 — Complete Product Features

#### Day 31 — Venue Registration & Admin Approval Backend + UI
**Objective:** Implement venue-owner onboarding.
**Member 1 (Frontend):** Build venue info form → payment step (stubbed) → "pending review" confirmation.
**Member 2 (Backend):** Implement `POST /api/v1/venues`, `POST /api/v1/venues/{id}/confirm-payment`, `GET /api/v1/admin/venues?status=`, `POST /api/v1/admin/venues/{id}/approve`/`reject` (Admin-only via `require_role`).
**Shared Team Tasks:** Walk through the full flow diagram together, confirm exact match.
**Deliverables:** Working venue registration + approval pipeline.
**Testing / Validation:** Register, confirm payment, approve as admin, confirm owner sees "approved."
**Dependencies:** Day 13.
**Definition of Done:** Correct status transitions; clear rejected state for owners.

#### Day 32 — Court Management Backend + UI
**Member 1 (Frontend):** Build venue-owner dashboard: courts list, add-court form, availability editor.
**Member 2 (Backend):** Implement court CRUD scoped to the owning venue owner (or admin).
**Shared Team Tasks:** Confirm ownership (not just role) is enforced.
**Deliverables:** Working court CRUD for approved venues.
**Testing / Validation:** As Venue Owner A, attempt to edit Venue Owner B's court; confirm 403.
**Dependencies:** Day 31.
**Definition of Done:** Only the owning venue owner (or admin) can manage a venue's courts.

#### Day 33 — Court Booking Backend (Double-Booking-Safe) + UI
**Member 1 (Frontend):** Build court search/select and booking confirmation UI.
**Member 2 (Backend):** Implement `GET /api/v1/courts/search` and `POST /api/v1/bookings` with a DB transaction lock (`SELECT ... FOR UPDATE` or a unique constraint) so simultaneous bookings for the same slot can't both succeed.
**Shared Team Tasks:** Stress-test the double-booking protection together.
**Deliverables:** Race-condition-safe court booking flow.
**Testing / Validation:** Fire two simultaneous booking requests for the same slot; confirm exactly one succeeds.
**Dependencies:** Day 32, Day 18.
**Definition of Done:** Double-booking is provably impossible under concurrent load.

#### Day 34 — Match Chat via Supabase Realtime + FastAPI-Validated Writes
**Objective:** Implement secure match chat, using Supabase Realtime for delivery instead of polling.
**Member 1 (Frontend):** Build the chat UI at `/chat/[matchId]`. Subscribe to new messages via the Supabase JS client:
  ```typescript
  const channel = supabase
    .channel(`match-${matchId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
      (payload) => setMessages((prev) => [...prev, payload.new])
    )
    .subscribe();
  ```
  Message *sending* still goes through FastAPI (`POST /api/v1/matches/{id}/messages`), not directly through the Supabase client — this keeps validation and access control in your business-logic layer while Realtime only handles delivery of the resulting row.
**Member 2 (Backend):** Implement `GET/POST /api/v1/matches/{id}/messages`, enforcing that only `match_players`/`conversation_members` can read or post. Enable RLS on the `messages` table with a policy restricting `select` to conversation members, since the frontend reads new rows directly via Realtime (bypassing FastAPI for that read path):
  ```sql
  alter table messages enable row level security;

  create policy "Members can read match messages"
    on messages for select
    using (
      exists (
        select 1 from conversation_members cm
        where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
      )
    );
  ```
  Enable the `messages` table for Realtime in Supabase (Database → Replication).
**Shared Team Tasks:** Test chat access control from two angles: (1) a non-participant can't `POST` via direct API call, (2) a non-participant's Realtime subscription receives nothing, thanks to the RLS policy.
**Deliverables:** Working, access-controlled match chat delivered via Supabase Realtime.
**Testing / Validation:** As a non-participant, attempt to read/write messages directly; confirm both paths are blocked.
**Dependencies:** Day 18, Day 13.
**Definition of Done:** Only match participants can read (via RLS-gated Realtime) or write (via FastAPI) a given match's messages.

#### Day 35 — Community Posts, Notifications, Storage Uploads, and Admin Moderation
**Objective:** Implement community posts, notifications, and file uploads (Supabase Storage), plus admin moderation.
**Member 1 (Frontend):** Build the community feed UI (post/like/comment/report); build an avatar/venue-photo upload component using `supabase.storage.from('avatars').upload(...)`; build a notification bell/list UI.
**Member 2 (Backend):** Implement post CRUD, like, comment, report, and admin moderation endpoints (`GET /api/v1/admin/posts/reported`, `DELETE /api/v1/admin/posts/{id}`). Implement the notification service (`create_notification`) called from events built in earlier weeks, plus `GET /api/v1/notifications`. Create Storage buckets (`avatars`, `venue-photos`) in Supabase with policies restricting uploads to authenticated users and, for `venue-photos`, to the owning venue owner.
**Shared Team Tasks:** Trigger each notification-generating event and confirm it appears in the bell; upload a test avatar and confirm it displays. Week 7 full feature demo. Retrospective.
**Deliverables:** Working posts, notifications, Storage uploads, and moderation.
**Testing / Validation:** Report a post, confirm it appears in the admin queue, delete it, confirm it disappears.
**Dependencies:** Days 31–34, Weeks 4–6 events.
**Definition of Done — Week 7 exit criteria:**
```
Venues        → registration → payment → admin approval working
Courts        → owner-scoped CRUD working
Bookings      → race-condition-safe booking working
Chat          → Realtime delivery, RLS-gated, FastAPI-validated writes
Posts         → create/like/comment/report/moderate working
Notifications → generated from real events, visible in UI
Storage       → avatar and venue-photo uploads working, policy-restricted
```
All product features from the architecture document are now implemented end-to-end.

---

### WEEK 8 — Testing and Quality Assurance

*(Unchanged in structure from a from-scratch build; test coverage now also includes JWT
verification edge cases and RLS policy checks alongside standard backend/frontend tests.)*

#### Day 36 — Backend Unit Tests: Auth Verification & Matches
**Member 1 (Frontend):** Set up Jest + React Testing Library; test `Button`, `Card`, `EmptyState`, and auth forms.
**Member 2 (Backend):** pytest suites for JWT verification edge cases (expired/malformed/missing token), match CRUD edge cases.
**Shared Team Tasks:** Set up a shared test-run command documented in the README.
**Deliverables:** Passing frontend and backend test suites.
**Testing / Validation:** Run both suites, all green.
**Dependencies:** Weeks 1–7.
**Definition of Done:** JWT and match CRUD edge cases fully covered and passing.

#### Day 37 — Backend Tests: Venues, Bookings, Chat/RLS, Posts
**Member 1 (Frontend):** Component/form tests for create-match, booking, and post-creation forms.
**Member 2 (Backend):** pytest suites for venue approval, court ownership, double-booking race condition, chat access control, post CRUD/report/moderation. Manually re-verify the `messages` RLS policy against a fresh test account pair.
**Shared Team Tasks:** Review `pytest --cov` together, identify gaps.
**Deliverables:** Extended backend and frontend test suites.
**Testing / Validation:** Coverage report reviewed.
**Dependencies:** Day 36, Week 7.
**Definition of Done:** Every Week 7 feature has passing tests covering its core authorization rule, including RLS on `messages`.

#### Day 38 — Frontend Testing: Navigation, State, Integration Points
**Member 1 (Frontend):** Tests for protected-route redirects, role-aware nav, `AuthContext` loading/error states, matchmaking rendering with mocked responses.
**Member 2 (Backend):** Support Member 1 with documented mock response shapes; continue closing Day 37 gaps.
**Shared Team Tasks:** Review frontend test suite for coverage of risky UI logic.
**Deliverables:** Frontend suite covering auth guards, nav, key component states.
**Testing / Validation:** `npm test` green.
**Dependencies:** Day 36.
**Definition of Done:** Protected-route logic and role-aware rendering covered by automated tests.

#### Day 39 — End-to-End Integration Testing of Full User Workflows
**Member 1 (Frontend):** Script/execute the full Player journey end-to-end.
**Member 2 (Backend):** Script/execute the full Venue Owner and Admin journeys end-to-end.
**Shared Team Tasks:** Run all three journeys together, log bugs by severity.
**Deliverables:** Bug tracker populated from full workflow testing.
**Testing / Validation:** All three journeys completed without a Critical failure.
**Dependencies:** Weeks 1–7.
**Definition of Done:** All primary journeys executed end-to-end, results logged.

#### Day 40 — Bug Triage and Critical/High Fix Day
**Member 1 (Frontend):** Fix frontend-side Critical/High bugs.
**Member 2 (Backend):** Fix backend-side Critical/High bugs.
**Shared Team Tasks:** Triage, assign, retest, retrospective for Week 8.
**Deliverables:** Zero open Critical bugs; zero unjustified open High bugs.
**Testing / Validation:** Re-run the Day 39 journeys, confirm resolution.
**Dependencies:** Day 39.
**Definition of Done — Week 8 exit criteria:**
```
Backend tests   → auth verification, matches, matchmaking, leave-risk,
                  waiting list, venues, bookings, chat/RLS, posts covered
Frontend tests  → components, forms, auth guards covered
E2E workflows   → Player, Venue Owner, Admin journeys verified
Bug backlog     → zero open Critical, zero unjustified open High
```

---

### WEEK 9 — Security, Performance, and UX

#### Day 41 — Security Review: Supabase Auth, Sessions, and Key Handling
**Objective:** Harden the identity layer and Supabase key usage specifically.
**Member 1 (Frontend):** Confirm only the **anon key** (never a service role key) is used in any frontend code — the anon key is safe to expose (it's constrained by RLS), a service role key is not. Confirm no sensitive data is logged to the console.
**Member 2 (Backend):** Confirm the **service role key** (if used anywhere, e.g. for admin scripts) lives only in backend `.env`, never in frontend code or committed files. Confirm `SUPABASE_JWT_SECRET` is loaded from `.env` only. Confirm token expiry is sane and the frontend's session refresh doesn't silently mask an actually-revoked session.
**Shared Team Tasks:** Grep the entire frontend codebase for any accidental service-role-key usage; confirm none exists.
**Deliverables:** Hardened key handling; documented findings in `documentation/security-review.md`.
**Testing / Validation:** Confirm the frontend bundle (`npm run build` output) contains only the anon key, never a service role key.
**Dependencies:** Weeks 3, 6.
**Definition of Done:** No service role key anywhere in frontend code or Git history; anon key usage confirmed RLS-constrained.

#### Day 42 — Security Review: RLS Coverage, Input Validation, CORS, Rate Limiting
**Objective:** Harden the API and database access surface.
**Member 1 (Frontend):** Confirm every form has client-side validation matching backend validation.
**Member 2 (Backend):** Full RLS audit: for every table the frontend could theoretically query directly via `supabase-js` (currently: `messages` for Realtime, and whatever Storage buckets exist), confirm RLS is enabled with a correct policy; for tables only ever touched through FastAPI (which connects with full DB privileges), confirm this is a deliberate choice, not an oversight, and document it. Confirm every FastAPI endpoint uses Pydantic for input validation and the ORM for all queries (no raw string-interpolated SQL — grep to verify). Tighten CORS to the real frontend origin only. Extend rate limiting to `/matches/{id}/messages` (POST) and `/posts` (POST) — login/signup rate limiting is now Supabase's responsibility, configurable in Supabase → Authentication → Rate Limits.
**Shared Team Tasks:** Grep the backend for raw SQL string formatting; review the RLS audit table together.
**Deliverables:** Documented, complete RLS audit; tightened CORS; rate limiting on sensitive FastAPI endpoints.
**Testing / Validation:** Attempt a SQL-injection payload in a search field; confirm it's treated as literal text.
**Dependencies:** Day 41.
**Definition of Done:** No raw SQL string interpolation exists; every table reachable directly by the frontend has RLS enabled and reviewed; CORS locked to the real origin.

#### Day 43 — Performance Review: Database
**Member 1 (Frontend):** Add pagination controls to any list screens still rendering unbounded lists.
**Member 2 (Backend):** Review query plans (`EXPLAIN ANALYZE`) for hot endpoints; add indexes on frequently filtered/joined columns. Confirm all list endpoints are server-side paginated. Note: Supabase's free/starter tiers have connection limits — confirm the SQLAlchemy connection pool size is reasonable (not defaulting to something that exhausts Supabase's pooler).
**Shared Team Tasks:** Load a larger synthetic dataset via an extended seed script; re-test response times together.
**Deliverables:** Indexed hot-path queries; confirmed server-side pagination; sane connection pool sizing.
**Testing / Validation:** Compare `/matches/recommended` response time before/after indexing.
**Dependencies:** Weeks 4–7.
**Definition of Done:** No unbounded list endpoints; measured query improvement documented; connection pool sized appropriately for Supabase's limits.

#### Day 44 — Performance Review: API and Frontend Rendering
**Member 1 (Frontend):** Audit for unnecessary re-fetching/over-aggressive Realtime re-renders; memoize expensive components.
**Member 2 (Backend):** Audit response payloads for over-fetching; add response-time logging; identify the 3 slowest endpoints.
**Shared Team Tasks:** Time a full cold-load of the dashboard before/after today's changes.
**Deliverables:** Reduced over-fetching on both sides; documented before/after timings.
**Testing / Validation:** Document in `documentation/performance-review.md`.
**Dependencies:** Day 43.
**Definition of Done:** No visibly redundant API calls or re-renders; slowest endpoints have documented mitigations.

#### Day 45 — UX Review and Week 9 Wrap-Up
**Member 1 (Frontend):** Pass over every screen for consistent loading/error/empty states, mobile responsiveness, basic accessibility.
**Member 2 (Backend):** Ensure every error response has a human-readable `detail` message.
**Shared Team Tasks:** Full-app walkthrough at mobile width. Retrospective for Week 9.
**Deliverables:** Consistent, responsive, accessible UI; readable error messages everywhere.
**Testing / Validation:** Full click-through at mobile width with no layout breakage.
**Dependencies:** Days 41–44, Weeks 1–8.
**Definition of Done — Week 9 exit criteria:**
```
Security     → keys handled correctly, RLS audited and enabled
               where needed, input validated, CORS tightened,
               no SQL injection surface, rate limits in place
Performance  → hot queries indexed, lists paginated, connection
               pool sane, over-fetching trimmed
UX           → consistent states, responsive, basic accessibility
```

---

### WEEK 10 — Finalization and Deployment

#### Day 46 — Production Supabase Project and Environment Setup
**Objective:** Prepare production infrastructure — no local Postgres setup needed, since Supabase *is* the production database.
**Member 1 (Frontend):** Prepare production environment variables (`NEXT_PUBLIC_API_URL`, production Supabase URL/anon key); confirm `npm run build` succeeds locally with production env vars.
**Member 2 (Backend):** Create a **production Supabase project** (`sportmate-prod`) — either upgrade to a paid tier for reliability or keep it on the free tier for an academic demo, per your needs. Apply the same schema: run `alembic upgrade head` against it, re-create the `profiles` trigger and RLS policies (Days 11, 15, 34) via the SQL Editor, re-create Storage buckets (Day 35). Prepare production `backend/.env` with the production project's `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`.
**Shared Team Tasks:** Agree on the hosting provider for the FastAPI and Next.js processes (Supabase only hosts the database/auth/realtime/storage layer, not your app code); document access credentials securely, not in Git.
**Deliverables:** Production Supabase project fully provisioned (schema, trigger, RLS, buckets); production env var plans for both apps.
**Testing / Validation:** Connect to the production Supabase database from a local script using its `DATABASE_URL`; confirm the schema matches dev.
**Dependencies:** Weeks 1–9.
**Definition of Done:** Production Supabase project exists with the complete schema, auth trigger, RLS policies, and Storage buckets; no production secrets in the Git repo.

#### Day 47 — Backend Deployment
**Objective:** Get FastAPI running in production, natively, pointed at the production Supabase project.
**Member 1 (Frontend):** Continue preparing the frontend build; fix any production-build-only errors.
**Member 2 (Backend):** Deploy FastAPI to the chosen host: install Python/dependencies natively, run via `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4` (or `gunicorn` with `UvicornWorker`), under a process manager (`systemd`/`supervisor`) for auto-restart. Configure HTTPS via a reverse proxy (e.g. Nginx). Confirm production `.env` points at `sportmate-prod`, not `sportmate-dev`.
**Shared Team Tasks:** Hit production `/health` and `/health/db` together over HTTPS; confirm `/health/db` reports success against the production Supabase project specifically (not accidentally still pointed at dev).
**Deliverables:** FastAPI running in production behind HTTPS, managed by a process manager, connected to `sportmate-prod`.
**Testing / Validation:** `curl https://<production-api-domain>/health/db` succeeds; kill the process and confirm the process manager restarts it.
**Dependencies:** Day 46.
**Definition of Done:** Backend is reachable over HTTPS in production, connected to the correct (production) Supabase project, and recovers from a crash automatically.

#### Day 48 — Frontend Deployment and CORS/API URL Finalization
**Member 1 (Frontend):** Deploy the built Next.js app; point `NEXT_PUBLIC_API_URL` at the production backend's HTTPS URL and `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` at `sportmate-prod`.
**Member 2 (Backend):** Update production CORS to allow only the production frontend's real domain; confirm HTTPS is enforced.
**Shared Team Tasks:** Load the production frontend together and walk through login → dashboard → create a match, confirming it talks to the production backend and the production Supabase project correctly.
**Deliverables:** Fully deployed frontend and backend, correctly wired to production Supabase.
**Testing / Validation:** Full login-to-match-creation flow tested live against production URLs, verified against `sportmate-prod`'s Table Editor.
**Dependencies:** Day 47.
**Definition of Done:** Production frontend loads over HTTPS and completes a real round-trip through the production backend into the production Supabase project.

#### Day 49 — End-to-End Production Testing, UAT, and Documentation
**Member 1 (Frontend):** Re-run the three end-to-end user journeys against production; write user-facing documentation.
**Member 2 (Backend):** Re-run backend smoke tests against production (auth verification, RLS-gated Realtime chat, rate limiting); finalize `/docs`; write `documentation/installation.md` covering Supabase project setup (schema, trigger, RLS, buckets) and running both apps locally — explicitly noting no Docker is required or used.
**Shared Team Tasks:** Final UAT pass against the architecture document, feature by feature, confirming each is present and working in production, including chat delivery via Realtime and file uploads via Storage. Final bug fixing.
**Deliverables:** Verified production deployment; complete API/installation/user docs.
**Testing / Validation:** Full UAT checklist against the architecture doc, all items passing.
**Dependencies:** Day 48.
**Definition of Done:** Every architecture-doc feature verified working in production; all documentation complete and committed.

#### Day 50 — Final Release, Git Cleanup, and Demo Rehearsal
**Member 1 (Frontend):** Clean up leftover debug code/console logs.
**Member 2 (Backend):** Clean up leftover debug endpoints/dead code; confirm no Supabase service role key or JWT secret exists anywhere in Git history.
**Shared Team Tasks:** Merge `develop` into `main`, tag `v1.0.0` with release notes. Final Git history cleanup. Full system demonstration rehearsal covering the whole product, including the Supabase-specific pieces: sign-up producing a profile automatically, real-time chat delivery, and a file upload. Prepare presentation materials, including a short note on the Supabase-based architecture decision and its trade-offs (managed infra vs. full custom build).
**Deliverables:** Tagged `v1.0.0` release; clean codebase; rehearsed demo; presentation materials.
**Testing / Validation:** The full rehearsal run completes without errors, end to end, against production.
**Dependencies:** Days 1–49.
**Definition of Done — Week 10 / Project exit criteria:**
```
Production   → frontend + backend live, no Docker, HTTPS enforced,
               CORS locked down, connected to sportmate-prod Supabase
Supabase     → prod schema, auth trigger, RLS, and Storage buckets
               verified working
Docs         → API docs, installation docs, user docs complete
Git          → main tagged v1.0.0, history clean, no secrets/keys
Demo         → full rehearsal completed successfully
```

---

## 4. Weekly Milestones

| Week | Milestone |
|---|---|
| 1 | Full stack running locally, including Supabase Auth smoke test (signup → FastAPI-verified token). |
| 2 | Complete application schema live in Supabase; navigable empty frontend shell. |
| 3 | Real Supabase Auth signup/login, auto-created `profiles`, RBAC via `profiles.role`, RLS reviewed. |
| 4 | Core backend domain complete: profiles, matches, matchmaking scoring, leave-risk, waiting list. |
| 5 | Core frontend live: profile, matches, matchmaking, leave-risk warnings, waiting list all wired. |
| 6 | Full frontend/backend integration verified, including Supabase session refresh, no known Critical bugs. |
| 7 | All remaining features complete: venues, courts, double-booking-safe bookings, Realtime chat, posts, notifications, Storage uploads. |
| 8 | Systematic test coverage including JWT/RLS edge cases; zero open Critical bugs. |
| 9 | Security (including RLS + key-handling audit), performance, and UX hardening complete. |
| 10 | Production deployment live against `sportmate-prod`, fully documented, demo rehearsed. |

---

## 5. Git Workflow

```
main
  │
  └── develop
        │
        ├── feature/frontend-xxx
        ├── feature/backend-xxx
        └── feature/database-xxx
```

- **Branch naming:** `feature/frontend-<short-description>`, `feature/backend-<short-description>`, `feature/database-<short-description>`; bug fixes: `fix/<short-description>`.
- **Commit conventions:** Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`.
- **Pull requests:** Every feature branch merges into `develop` via a reviewed PR.
- **Code reviews:** The other developer reviews every PR — including any SQL run directly in Supabase (trigger definitions, RLS policies), which should be committed to `documentation/` or a `supabase/` folder as `.sql` files even though they're not applied via Alembic.
- **Merging:** Squash-merge into `develop`; `develop` merges into `main` at verified weekly milestones.
- **Conflict resolution:** Whoever merges resolves conflicts locally, re-runs tests, gets a second look if shared logic was touched.
- **Release tags:** Tag `main` at major milestones (e.g. `v0.1.0` after Week 3 auth, `v0.5.0` after Week 6) and `v1.0.0` at Day 50.
- **When to merge into `develop`:** As soon as a PR is approved and tests pass.
- **When to merge into `main`:** Only at verified weekly milestones.

---

## 6. Testing Strategy

Testing runs continuously from Week 2 onward:

- **Unit testing:** Matchmaking sub-scores, leave-risk classification, JWT verification edge cases, and components — started as each is built.
- **API testing:** Every FastAPI endpoint gets pytest coverage for its happy path and authorization/validation edge cases.
- **Database testing:** Foreign keys, cascading behavior, the double-booking transaction lock, and **RLS policy correctness** (tested by querying as different authenticated users, not just via FastAPI's privileged connection).
- **Integration testing:** `Next.js → FastAPI → Supabase Postgres` round-trips, plus `Next.js → Supabase Realtime` for chat delivery and `Next.js → Supabase Storage` for uploads.
- **End-to-end testing:** The three full user journeys, scripted and run on Day 39, re-run on Day 49 against production.
- **User acceptance testing:** Day 49's feature-by-feature pass against the architecture document.

Bug severity classification (Weeks 6, 8, 9):
```
Critical → blocks a core flow or causes data loss/security issue
High     → a feature is broken but there's a workaround
Medium   → a feature is degraded but usable
Low      → cosmetic or minor annoyance
```

---

## 7. Deployment Strategy (No Docker)

```
Next.js  →  FastAPI  →  Supabase (PostgreSQL + Auth + Realtime + Storage)
```

- **Supabase:** The production project (`sportmate-prod`) *is* the production database, auth provider, realtime layer, and file store — no separate PostgreSQL install or management is needed. Schema is applied via `alembic upgrade head`; Supabase-specific SQL (the auth-sync trigger, RLS policies) is applied via the SQL Editor and kept as versioned `.sql` files in the repo for reproducibility.
- **FastAPI:** Deployed by installing Python and dependencies directly on the host, run via `uvicorn` (or `gunicorn` with `UvicornWorker` for multiple workers), kept alive by a native process manager, behind a reverse proxy terminating HTTPS.
- **Next.js:** Deployed via `npm run build` then `npm run start` natively on the host, with environment variables pointed at the production backend and the production Supabase project.
- **Environment variables:** Separate `.env`/`.env.local` files for production (never committed); `.env.example` files document required keys — `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` (backend) and `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend). A Supabase **service role key**, if ever needed for an admin script, is never placed in frontend code or committed anywhere.
- **CORS:** Restricted in production to the exact frontend origin.
- **HTTPS:** Enforced on both the API and the frontend.
- **API/Supabase URL configuration:** The frontend never hardcodes `localhost` or the dev Supabase project; both are always read from environment configuration.
- **Build process:** Backend has no build step beyond dependency install; frontend runs `npm run build`.
- **Startup:** Both processes configured to start automatically on host reboot via the process manager.
- **Production testing:** Days 48–49 verify the full stack, including Supabase Auth, Realtime, and Storage, in production before Day 50's rehearsal.

The exact hosting provider for FastAPI and Next.js is left flexible; Supabase itself is the fixed choice for the database/auth/realtime/storage layer.

---

## 8. Final Project Checklist

- [ ] Product requirements completed
- [ ] Frontend completed
- [ ] Backend completed
- [ ] Supabase project (schema, auth trigger, RLS, Storage buckets) configured
- [ ] API completed
- [ ] Authentication completed (Supabase Auth + FastAPI JWT verification)
- [ ] Authorization completed (RBAC via `profiles.role`)
- [ ] Row Level Security reviewed and enabled where the frontend queries Supabase directly
- [ ] Validation completed
- [ ] Error handling completed
- [ ] Responsive UI completed
- [ ] Security reviewed (including key handling)
- [ ] Performance reviewed
- [ ] Unit tests completed
- [ ] API tests completed
- [ ] Integration tests completed
- [ ] End-to-end tests completed
- [ ] Production deployment completed (against `sportmate-prod`)
- [ ] Documentation completed
- [ ] Git repository cleaned (no secrets or service role keys)
- [ ] Final demonstration prepared
- [ ] Final presentation prepared
