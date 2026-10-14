def contains_pattern(value: str) -> str:
    """LIKE pattern for 'contains', with %, _ and \\ in the user's text escaped (use escape="\\\\")."""
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"
