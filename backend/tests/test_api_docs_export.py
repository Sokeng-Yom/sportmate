from app.db.export_api_docs import build_examples
from app.main import app


def test_every_endpoint_gets_an_example():
    examples = build_examples(app.openapi())
    assert len(examples) >= 30
    for key, entry in examples.items():
        assert entry["summary"], key
    recommended = examples["GET /api/v1/matches/recommended"]["response"]
    assert {"items", "total", "page", "page_size"} <= set(recommended)
    assert "score" in recommended["items"][0]
