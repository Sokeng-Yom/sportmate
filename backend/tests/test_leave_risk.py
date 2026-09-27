from datetime import date, time, datetime

from app.services.leave_risk import hours_remaining, classify_risk, RISK_NORMAL, RISK_WARNING, RISK_HIGH_RISK, RISK_CRITICAL


def test_hours_remaining_computation():
    now = datetime(2026, 11, 1, 10, 0)
    result = hours_remaining(date(2026, 11, 1), time(19, 0), now=now)
    assert result == 9.0


def test_classify_risk_normal():
    assert classify_risk(48) == RISK_NORMAL
    assert classify_risk(24.1) == RISK_NORMAL


def test_classify_risk_warning():
    assert classify_risk(24) == RISK_WARNING
    assert classify_risk(10) == RISK_WARNING
    assert classify_risk(4.1) == RISK_WARNING


def test_classify_risk_high_risk():
    assert classify_risk(4) == RISK_HIGH_RISK
    assert classify_risk(3) == RISK_HIGH_RISK
    assert classify_risk(2.1) == RISK_HIGH_RISK


def test_classify_risk_critical():
    assert classify_risk(2) == RISK_CRITICAL
    assert classify_risk(0.5) == RISK_CRITICAL
    assert classify_risk(-1) == RISK_CRITICAL  # match already started
