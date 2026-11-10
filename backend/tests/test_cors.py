"""CORS origins are configurable via the CORS_ORIGINS environment variable."""

from app.main import DEFAULT_CORS_ORIGINS, app, cors_origins


def test_cors_origins_default(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    assert cors_origins() == [DEFAULT_CORS_ORIGINS]


def test_cors_origins_from_env(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://a.example, https://b.example ,")
    assert cors_origins() == ["https://a.example", "https://b.example"]


def test_cors_middleware_uses_origins():
    from fastapi.testclient import TestClient

    client = TestClient(app)
    ok = client.get("/api/health", headers={"Origin": DEFAULT_CORS_ORIGINS})
    assert ok.headers.get("access-control-allow-origin") == DEFAULT_CORS_ORIGINS
    bad = client.get("/api/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in bad.headers
