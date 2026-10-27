from datetime import datetime

from app.core.clock import local_now_naive, utc_now_naive
from app.core.search import contains_pattern
from app.services.court_availability import is_open

WEEK = {"mon": [{"start": "08:00", "end": "12:00"}, {"start": "14:00", "end": "18:00"}]}


def _slot(start_hour, start_minute, end_hour, end_minute, day=7):  # 2030-01-07 is a Monday
    return datetime(2030, 1, day, start_hour, start_minute), datetime(2030, 1, day, end_hour, end_minute)


def test_a_slot_inside_an_opening_window_is_open():
    assert is_open(WEEK, *_slot(8, 0, 9, 0))
    assert is_open(WEEK, *_slot(14, 0, 15, 0))
    assert is_open(WEEK, *_slot(17, 30, 18, 0))  # ending exactly at closing time is fine


def test_slots_crossing_a_boundary_or_in_a_gap_are_closed():
    assert not is_open(WEEK, *_slot(11, 30, 12, 30))  # runs past closing
    assert not is_open(WEEK, *_slot(12, 0, 13, 0))  # lunch gap
    assert not is_open(WEEK, *_slot(18, 0, 19, 0))  # after hours
    assert not is_open(WEEK, *_slot(7, 30, 8, 30))  # starts before opening


def test_days_without_hours_and_missing_schedules_are_closed():
    assert not is_open(WEEK, *_slot(9, 0, 10, 0, day=8))  # Tuesday has no windows
    assert not is_open(None, *_slot(9, 0, 10, 0))
    assert not is_open({}, *_slot(9, 0, 10, 0))


def test_a_booking_cannot_cross_midnight():
    assert not is_open(WEEK, datetime(2030, 1, 7, 23, 0), datetime(2030, 1, 8, 1, 0))


def test_search_text_is_escaped():
    assert contains_pattern("hall") == "%hall%"
    assert contains_pattern("50%_off") == "%50\\%\\_off%"
    assert contains_pattern("a\\b") == "%a\\\\b%"


def test_local_time_is_seven_hours_ahead_of_utc():
    hours = (local_now_naive() - utc_now_naive()).total_seconds() / 3600
    assert 6.99 < hours < 7.01
