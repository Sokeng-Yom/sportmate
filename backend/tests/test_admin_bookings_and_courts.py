import uuid
from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from app.core.clock import UtcDateTime
from app.main import app
from app.schemas.booking import BookingRead, PaginatedBookings
from app.schemas.court import CourtRead, CourtSearchItem, PaginatedCourtSearch


def test_admin_bookings_and_courts_routes_registered():
    spec = app.openapi()
    paths = spec["paths"]

    # Admin bookings route
    assert "/api/v1/admin/bookings" in paths
    assert "get" in paths["/api/v1/admin/bookings"]
    schema_ref = paths["/api/v1/admin/bookings"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
    assert "PaginatedBookings" in schema_ref

    # Admin courts route
    assert "/api/v1/admin/courts" in paths
    assert "get" in paths["/api/v1/admin/courts"]
    court_schema_ref = paths["/api/v1/admin/courts"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
    assert "PaginatedCourtSearch" in court_schema_ref

    # Court delete route
    assert "/api/v1/courts/{court_id}" in paths
    assert "delete" in paths["/api/v1/courts/{court_id}"]
    assert "204" in paths["/api/v1/courts/{court_id}"]["delete"]["responses"]


def test_booking_read_schema_compatibility():
    """Verify that BookingRead accurately accepts all joined fields from Booking, Court, Venue, Profile."""
    sample = {
        "id": uuid.uuid4(),
        "court_id": uuid.uuid4(),
        "match_id": uuid.uuid4(),
        "booked_by": uuid.uuid4(),
        "start_time": datetime(2026, 10, 23, 18, 0, 0),
        "end_time": datetime(2026, 10, 23, 19, 0, 0),
        "status": "CONFIRMED",
        "created_at": datetime(2026, 10, 20, 10, 30, 0, tzinfo=timezone.utc),
        "court_name": "Court A",
        "venue_id": uuid.uuid4(),
        "venue_name": "Riverside Tennis Center",
        "booker_name": "Sokha Kim",
    }
    booking = BookingRead.model_validate(sample)
    dumped = booking.model_dump(mode="json")
    assert dumped["court_name"] == "Court A"
    assert dumped["venue_name"] == "Riverside Tennis Center"
    assert dumped["booker_name"] == "Sokha Kim"
    assert dumped["status"] == "CONFIRMED"
    assert dumped["created_at"] == "2026-10-20T10:30:00Z"

    # PaginatedBookings validation
    paginated = PaginatedBookings(items=[booking], total=1, page=1, page_size=20)
    dumped_page = paginated.model_dump(mode="json")
    assert dumped_page["total"] == 1
    assert len(dumped_page["items"]) == 1
    assert dumped_page["items"][0]["id"] == str(sample["id"])


def test_court_search_schema_compatibility():
    """Verify CourtSearchItem and PaginatedCourtSearch accept venue metadata."""
    sample = {
        "id": uuid.uuid4(),
        "venue_id": uuid.uuid4(),
        "name": "Pitch 1",
        "sport": "Football",
        "availability": {
            "mon": [{"start": "08:00:00", "end": "22:00:00"}],
            "tue": [],
            "wed": [],
            "thu": [],
            "fri": [],
            "sat": [],
            "sun": [],
        },
        "created_at": datetime(2026, 10, 15, 8, 0, 0, tzinfo=timezone.utc),
        "venue_name": "Greenfield Football Park",
        "venue_address": "Sen Sok, Phnom Penh",
    }
    court_item = CourtSearchItem.model_validate(sample)
    dumped = court_item.model_dump(mode="json")
    assert dumped["name"] == "Pitch 1"
    assert dumped["venue_name"] == "Greenfield Football Park"
    assert dumped["venue_address"] == "Sen Sok, Phnom Penh"

    page = PaginatedCourtSearch(items=[court_item], total=1, page=1, page_size=20)
    assert page.total == 1
    assert page.items[0].venue_name == "Greenfield Football Park"


def test_booking_actions_http_methods_and_routes():
    spec = app.openapi()
    paths = spec["paths"]

    # Approve booking: POST /api/v1/bookings/{booking_id}/approve
    assert "/api/v1/bookings/{booking_id}/approve" in paths
    assert "post" in paths["/api/v1/bookings/{booking_id}/approve"]

    # Reject booking: POST /api/v1/bookings/{booking_id}/reject
    assert "/api/v1/bookings/{booking_id}/reject" in paths
    assert "post" in paths["/api/v1/bookings/{booking_id}/reject"]

    # Cancel booking: POST /api/v1/bookings/{booking_id}/cancel
    assert "/api/v1/bookings/{booking_id}/cancel" in paths
    assert "post" in paths["/api/v1/bookings/{booking_id}/cancel"]


def test_booking_timestamp_semantics():
    """Verify start_time/end_time are naive Cambodia wall-clock time and created_at is UTC."""
    naive_start = datetime(2026, 11, 5, 14, 0, 0)
    naive_end = datetime(2026, 11, 5, 15, 30, 0)
    utc_created = datetime(2026, 11, 1, 7, 0, 0, tzinfo=timezone.utc)

    b = BookingRead(
        id=uuid.uuid4(),
        court_id=uuid.uuid4(),
        match_id=None,
        booked_by=uuid.uuid4(),
        start_time=naive_start,
        end_time=naive_end,
        status="CONFIRMED",
        created_at=utc_created,
        court_name="Court 1",
        venue_id=uuid.uuid4(),
        venue_name="Central Venue",
        booker_name="Player One",
    )
    data = b.model_dump(mode="json")
    # start_time and end_time do not have 'Z' because they are naive local wall-clock datetimes
    assert not data["start_time"].endswith("Z")
    assert data["start_time"] == "2026-11-05T14:00:00"
    assert data["end_time"] == "2026-11-05T15:30:00"
    # created_at is a UTC timestamp with 'Z'
    assert data["created_at"] == "2026-11-01T07:00:00Z"


def test_court_deletion_safeguard_logic():
    """Test unit logic of delete_court when bookings exist."""
    from unittest.mock import MagicMock
    from fastapi import HTTPException
    from app.api.v1.courts import delete_court
    from app.models.venue import Court, Venue

    mock_db = MagicMock()
    court_id = uuid.uuid4()
    venue_id = uuid.uuid4()
    owner_id = uuid.uuid4()
    mock_court = Court(id=court_id, venue_id=venue_id, name="Court 1", sport="Football")
    mock_venue = Venue(id=venue_id, name="Test Venue", status="APPROVED", owner_id=owner_id)
    mock_profile = MagicMock(id=owner_id, role="ADMIN")

    mock_db.query.return_value.filter.return_value.first.side_effect = [
        mock_court,        # Court.id == court_id
        mock_venue,        # get_venue_or_404 -> Venue.id == venue_id
        uuid.uuid4(),      # Booking.court_id == court.id (existing booking found!)
    ]

    with pytest.raises(HTTPException) as exc_info:
        delete_court(court_id=mock_court.id, profile=mock_profile, db=mock_db)
    assert exc_info.value.status_code == 400
    assert "existing bookings or booking history" in exc_info.value.detail

