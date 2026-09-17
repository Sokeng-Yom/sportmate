## Schema pattern
Every resource gets up to three Pydantic schemas in app/schemas/<resource>.py:
- `<Resource>Create` — fields required to create a new one (omit if not applicable, e.g. Profile)
- `<Resource>Read` — fields returned to the client (uses `model_config = ConfigDict(from_attributes=True)`)
- `<Resource>Update` — all fields optional, for partial updates

## Repository pattern
Every resource gets a repository in app/repositories/<resource>_repository.py
extending BaseRepository[Model] from app/repositories/base.py.