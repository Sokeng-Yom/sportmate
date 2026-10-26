from pathlib import Path

path = Path("app/services/waiting_list_service.py")
text = path.read_text(encoding="utf-8")

if "def count_joined_for_matches" in text:
    raise SystemExit("Already defined, nothing to do.")

HELPER = '''

def count_joined_for_matches(db: Session, match_ids) -> dict:
    """Players per match for many matches in ONE query: {match_id: count}. Matches with no players are absent."""
    ids = list(match_ids)
    if not ids:
        return {}
    rows = (
        db.query(MatchPlayer.match_id, func.count(MatchPlayer.id))
        .filter(MatchPlayer.match_id.in_(ids))
        .group_by(MatchPlayer.match_id)
        .all()
    )
    return {match_id: count for match_id, count in rows}
'''
new_text = text.rstrip("\n") + "\n" + HELPER
compile(new_text, str(path), "exec")
path.write_text(new_text, encoding="utf-8")
print("Appended count_joined_for_matches")
