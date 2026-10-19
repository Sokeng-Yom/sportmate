from datetime import timedelta

from app.core.clock import local_now_naive
from app.services.leave_risk import classify_risk, hours_remaining


def test_hours_remaining_uses_cambodia_local_time():
    start = local_now_naive() + timedelta(hours=3)
    hours = hours_remaining(start.date(), start.time())
    assert 2.9 < hours <= 3.0
    assert classify_risk(hours) == "HIGH_RISK"


def test_preview_classifies_a_match_three_local_hours_away_as_high_risk(client, auth_headers_for):
    creator, joiner = auth_headers_for("PLAYER"), auth_headers_for("PLAYER")
    start = local_now_naive() + timedelta(hours=3)
    match = client.post("/api/v1/matches", json={
        "sport": "Badminton", "location": "Phnom Penh", "date": start.date().isoformat(),
        "time": start.time().isoformat(), "players_needed": 3, "skill_level": "BEGINNER",
    }, headers=creator).json()
    client.post(f"/api/v1/matches/{match['id']}/join", headers=joiner)

    preview = client.get(f"/api/v1/matches/{match['id']}/leave-risk-preview", headers=joiner).json()
    assert preview["risk_level"] == "HIGH_RISK" and preview["will_restrict"] is False
