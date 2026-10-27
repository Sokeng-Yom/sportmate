from pathlib import Path

PATCHES = {
    "app/api/v1/matches.py": [
        ("from app.services.recommendations import build_recommendations\n",
         "from app.services.join_rules import ensure_not_restricted, ensure_not_started\n"
         "from app.services.recommendations import build_recommendations\n", 1),
        ('        raise HTTPException(status_code=400, detail=f"Cannot join a match with status {match.status}")\n',
         '        raise HTTPException(status_code=400, detail=f"Cannot join a match with status {match.status}")\n'
         "    ensure_not_started(match)\n", 1),
        ('        raise HTTPException(status_code=400, detail=f"Cannot join the waiting list of a {match.status} match")\n',
         '        raise HTTPException(status_code=400, detail=f"Cannot join the waiting list of a {match.status} match")\n'
         "    ensure_not_started(match)\n", 1),
        ("    # Lock first: positions are max()+1, so two simultaneous waiters must queue up here.\n",
         "    ensure_not_restricted(db, user_id)\n\n"
         "    # Lock first: positions are max()+1, so two simultaneous waiters must queue up here.\n", 1),
    ],
    "app/api/v1/waiting_list.py": [
        ("from app.services.waiting_list_service import count_joined\n",
         "from app.services.join_rules import ensure_not_restricted\n"
         "from app.services.waiting_list_service import count_joined\n", 1),
        ('        raise HTTPException(status_code=403, detail="This waiting list entry does not belong to you")\n',
         '        raise HTTPException(status_code=403, detail="This waiting list entry does not belong to you")\n'
         "    ensure_not_restricted(db, entry.user_id)\n", 1),
    ],
    "app/main.py": [
        ("from app.services.waiting_list_expiry import expire_stale_waiting_list_entries\n",
         "from app.services.match_lifecycle import close_finished_matches\n"
         "from app.services.waiting_list_expiry import expire_stale_waiting_list_entries\n", 1),
        ('scheduler = BackgroundScheduler()\nscheduler.add_job(run_expiry_check, "interval", minutes=1)\n',
         "def run_match_lifecycle_check():\n"
         "    db = SessionLocal()\n"
         "    try:\n"
         "        closed = close_finished_matches(db)\n"
         "        if closed:\n"
         '            logger.info("Closed %d finished matches", closed)\n'
         "    finally:\n"
         "        db.close()\n\n\n"
         "scheduler = BackgroundScheduler()\n"
         'scheduler.add_job(run_expiry_check, "interval", minutes=1)\n'
         'scheduler.add_job(run_match_lifecycle_check, "interval", minutes=5)\n', 1),
    ],
    # tests: a "match in one hour" must be one hour away in Cambodia local time, not in UTC
    "tests/test_match_lifecycle.py": [
        ("near_future = datetime.utcnow() + timedelta(hours=1)",
         "near_future = local_now_naive() + timedelta(hours=1)", 2),
    ],
    "tests/test_waiting_list_scenarios.py": [
        ("from app.core.clock import utc_now, utc_now_naive\n",
         "from app.core.clock import local_now_naive, utc_now, utc_now_naive\n", 1),
        ("starts_at=utc_now_naive() + timedelta(hours=1)",
         "starts_at=local_now_naive() + timedelta(hours=1)", 1),
    ],
}
PREPEND = {"tests/test_match_lifecycle.py": "from app.core.clock import local_now_naive\n"}

new_texts, problems = {}, []
for filename, pairs in PATCHES.items():
    path = Path(filename)
    if not path.exists():
        problems.append(f"{filename}: file not found")
        continue
    text = path.read_text(encoding="utf-8")
    ok = True
    for old, new, expected in pairs:
        if text.count(old) != expected:
            problems.append(f"{filename}: expected {expected} match(es), found {text.count(old)} for:\n{old}")
            ok = False
            break
        text = text.replace(old, new)
    if ok:
        new_texts[filename] = PREPEND.get(filename, "") + text

for filename, text in new_texts.items():
    Path(filename).write_text(text, encoding="utf-8")
    print("patched", filename)
if problems:
    print("\nSKIPPED (paste this to me):\n" + "\n\n".join(problems))
    raise SystemExit(1)
