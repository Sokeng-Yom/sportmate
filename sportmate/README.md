# SportMate

## Running the Application

The project structure has the Python backend at `sportmate/backend/`. To fix the `ModuleNotFoundError: No module named 'app'` error, you need to ensure Python can find the `app` package located in `backend/app/`.

### Recommended: Run from the backend directory

```powershell
cd sportmate/backend
# Activate virtual environment (if needed)
.\venv\Scripts\activate
# Run with uvicorn
uvicorn app.main:app --reload
# Or simply run the module
python -m app.main
```

### Alternative: Set PYTHONPATH from sportmate directory

```powershell
$env:PYTHONPATH = "backend;$env:PYTHONPATH"
cd sportmate
python -m backend.app.main
```

## Project Structure

- `sportmate/backend/app/` - Python package with the FastAPI application
- `sportmate/backend/venv/` - Virtual environment with dependencies installed
- `sportmate/backend/requirements.txt` - Project dependencies
- `sportmate/frontend/` - Frontend code
- `sportmate/documentation~/` - Documentation
