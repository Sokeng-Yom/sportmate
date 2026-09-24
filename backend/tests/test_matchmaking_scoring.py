from datetime import date

from app.services.matchmaking import (
    sport_score,
    skill_score,
    availability_score,
    location_score,
    reliability_score,
    compute_match_score,
)


def test_sport_score_match():
    assert sport_score(["Badminton", "Tennis"], "Badminton") == 1.0


def test_sport_score_no_match():
    assert sport_score(["Tennis"], "Badminton") == 0.0


def test_sport_score_case_insensitive():
    assert sport_score(["badminton"], "Badminton") == 1.0


def test_skill_score_exact_match():
    assert skill_score("INTERMEDIATE", "INTERMEDIATE") == 1.0


def test_skill_score_one_level_off():
    assert skill_score("BEGINNER", "INTERMEDIATE") == 0.5
    assert skill_score("ADVANCED", "INTERMEDIATE") == 0.5


def test_skill_score_two_levels_off():
    assert skill_score("BEGINNER", "ADVANCED") == 0.0


def test_skill_score_no_user_skill():
    assert skill_score(None, "INTERMEDIATE") == 0.0


def test_availability_score_unconstrained():
    assert availability_score(None, date(2026, 11, 1)) == 1.0


def test_availability_score_exact_date():
    assert availability_score(date(2026, 11, 1), date(2026, 11, 1)) == 1.0


def test_availability_score_far_date():
    assert availability_score(date(2026, 11, 1), date(2026, 12, 1)) == 0.0


def test_location_score_unconstrained():
    assert location_score(None, "Phnom Penh") == 1.0


def test_location_score_substring_match():
    assert location_score("Phnom Penh", "Central Court, Phnom Penh") == 1.0


def test_location_score_no_match():
    assert location_score("Siem Reap", "Phnom Penh") == 0.0


def test_reliability_score_no_history():
    assert reliability_score(0, 0) == 1.0


def test_reliability_score_all_critical():
    assert reliability_score(3, 3) == 0.0


def test_reliability_score_mixed():
    assert reliability_score(1, 4) == 0.75


def test_compute_match_score_perfect_match():
    score = compute_match_score(
        user_sports=["Badminton"],
        user_skill_level="INTERMEDIATE",
        critical_leave_count=0,
        total_leave_count=0,
        match_sport="Badminton",
        match_skill_level="INTERMEDIATE",
        match_date=date(2026, 11, 1),
        match_location="Phnom Penh",
        preferred_date=date(2026, 11, 1),
        preferred_location="Phnom Penh",
    )
    # 1.0*0.30 + 1.0*0.25 + 1.0*0.20 + 1.0*0.15 + 1.0*0.10 = 1.0
    assert score == 1.0


def test_compute_match_score_no_sport_match_caps_score():
    score = compute_match_score(
        user_sports=["Tennis"],
        user_skill_level=None,
        critical_leave_count=0,
        total_leave_count=0,
        match_sport="Badminton",
        match_skill_level="INTERMEDIATE",
        match_date=date(2026, 11, 1),
        match_location="Phnom Penh",
    )
    # sport=0, skill=0 (no user skill for badminton), availability=1*0.20, location=1*0.15, reliability=1*0.10
    assert score == 0.45
