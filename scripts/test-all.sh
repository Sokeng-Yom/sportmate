#!/usr/bin/env bash
# Runs the backend and frontend test suites. From the repo root:  bash scripts/test-all.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== Backend =="
cd "$ROOT/backend"
PY=./venv/Scripts/python.exe
[ -x "$PY" ] || PY=./venv/bin/python
"$PY" -m pytest tests/ -q

echo "== Frontend =="
cd "$ROOT/frontend"
npm test -- --ci
