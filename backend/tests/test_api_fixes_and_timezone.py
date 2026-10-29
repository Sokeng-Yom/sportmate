import uuid
from datetime import datetime, timezone
import zoneinfo
import pytest
from pydantic import BaseModel

from app.core.clock import UtcDateTime, ensure_utc


class TimestampPayload(BaseModel):
    created_at: UtcDateTime


def test_utc_datetime_serialization_has_z():
    """Ensure naive UTC datetimes are serialized with 'Z' suffix in JSON."""
    naive_dt = datetime(2026, 10, 29, 14, 30, 0)
    payload = TimestampPayload(created_at=naive_dt)
    data = payload.model_dump(mode="json")
    assert data["created_at"] == "2026-10-29T14:30:00Z"

    # Already aware UTC
    aware_dt = datetime(2026, 10, 29, 14, 30, 0, tzinfo=timezone.utc)
    payload2 = TimestampPayload(created_at=aware_dt)
    assert payload2.model_dump(mode="json")["created_at"] == "2026-10-29T14:30:00Z"


def test_timezone_conversion_near_midnight_in_phnom_penh():
    """Ensure moments near midnight UTC correctly shift to next day in Asia/Phnom_Penh (UTC+7)."""
    # 2026-10-29 17:30:00 UTC is 2026-10-30 00:30:00 in Cambodia (UTC+7)
    utc_moment = datetime(2026, 10, 29, 17, 30, 0, tzinfo=timezone.utc)
    cambodia_tz = zoneinfo.ZoneInfo("Asia/Phnom_Penh")
    cambodia_time = utc_moment.astimezone(cambodia_tz)

    assert cambodia_time.year == 2026
    assert cambodia_time.month == 10
    assert cambodia_time.day == 30
    assert cambodia_time.hour == 0
    assert cambodia_time.minute == 30


def test_matches_mine_unauthenticated_returns_401(client):
    response = client.get("/api/v1/matches/mine")
    assert response.status_code == 401


def test_matches_mine_authenticated_returns_paginated_matches(client, auth_headers_for, new_match):
    creator = auth_headers_for("PLAYER")
    match_id, _ = new_match(creator, players_needed=3)

    # Calling /mine as authenticated player
    response = client.get("/api/v1/matches/mine", headers=creator)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert any(m["id"] == match_id for m in data["items"])

    # Test role filtering: role=created
    res_created = client.get("/api/v1/matches/mine?role=created", headers=creator)
    assert res_created.status_code == 200
    assert any(m["id"] == match_id for m in res_created.json()["items"])

    # Test role filtering: role=joined (creator alone hasn't joined someone else's match)
    res_joined = client.get("/api/v1/matches/mine?role=joined", headers=creator)
    assert res_joined.status_code == 200
    assert all(m["id"] != match_id for m in res_joined.json()["items"])


def test_chat_unread_count_unauthenticated_returns_401(client):
    response = client.get("/api/v1/matches/chat/unread-count")
    assert response.status_code == 401


def test_chat_unread_count_authenticated_returns_200(client, auth_headers_for):
    player = auth_headers_for("PLAYER")
    response = client.get("/api/v1/matches/chat/unread-count", headers=player)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "unread_count" in data
    assert isinstance(data["unread_count"], int)
    assert data["unread_count"] >= 0

