import pytest
from fastapi.testclient import TestClient

from backend.app.api.dependencies.auth import (
    get_current_user,
)
from backend.app.main import app
from backend.app.models.role import UserRole
from backend.app.models.user import User


client = TestClient(app)


@pytest.fixture(autouse=True)
def fake_audit_writer(monkeypatch):
    audit_calls = []

    def fake_record_rag_audit(**kwargs):
        audit_calls.append(kwargs)

    monkeypatch.setattr(
        "backend.app.api.routes.rag.record_rag_audit",
        fake_record_rag_audit,
    )

    return audit_calls


@pytest.fixture(autouse=True)
def override_authenticated_user():
    def fake_current_user():
        return User(
            id=1,
            full_name="Test Executive",
            email="executive@example.com",
            password_hash="not-used-in-this-test",
            role=UserRole("executive"),
            is_active=True,
        )

    app.dependency_overrides[get_current_user] = (
        fake_current_user
    )

    yield

    app.dependency_overrides.clear()


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "Secure RAG Assistant",
    }


def test_ask_uses_authenticated_database_role(
    monkeypatch,
    fake_audit_writer,
):
    captured_request = {}

    def fake_answer_question(question, user_role,conversation_history=None,):
        captured_request["question"] = question
        captured_request["role"] = user_role.value

        return {
            "answer": (
                "Project Aurora is confidential "
                "[Source 1]."
            ),
            "citations": [
                {
                    "source_number": 1,
                    "title": "Executive Strategy",
                    "document_id": "DOC-EXE-001",
                    "chunk_id": (
                        "DOC-EXE-001-CHUNK-001"
                    ),
                    "score": 0.7024,
                }
            ],
        }

    monkeypatch.setattr(
        "backend.app.api.routes.rag.answer_question",
        fake_answer_question,
    )

    response = client.post(
        "/api/v1/ask",
        json={
            "question": "What is Project Aurora?",
        },
    )

    assert response.status_code == 200

    assert captured_request == {
        "question": "What is Project Aurora?",
        "role": "executive",
    }

    assert len(fake_audit_writer) == 1

    audit = fake_audit_writer[0]

    assert audit["user_id"] == 1
    assert audit["role_used"] == "executive"
    assert audit["question"] == (
        "What is Project Aurora?"
    )
    assert audit["outcome"] == "answered"
    assert audit["source_document_ids"] == [
        "DOC-EXE-001"
    ]
    assert audit["duration_ms"] >= 0


def test_client_cannot_inject_role():
    response = client.post(
        "/api/v1/ask",
        json={
            "question": "What is Project Aurora?",
            "role": "executive",
        },
    )

    assert response.status_code == 422


def test_empty_question_returns_validation_error():
    response = client.post(
        "/api/v1/ask",
        json={
            "question": "",
        },
    )

    assert response.status_code == 422


def test_service_failure_returns_safe_error(
    monkeypatch,
    fake_audit_writer,
):
    def fake_failure(question, user_role):
        raise RuntimeError(
            "Simulated internal failure."
        )

    monkeypatch.setattr(
        "backend.app.api.routes.rag.answer_question",
        fake_failure,
    )

    response = client.post(
        "/api/v1/ask",
        json={
            "question": "What is Project Aurora?",
        },
    )

    assert response.status_code == 503
    assert response.json() == {
        "detail": (
            "RAG service is temporarily unavailable."
        )
    }

    assert len(fake_audit_writer) == 1
    assert fake_audit_writer[0]["outcome"] == "error"
    assert (
        fake_audit_writer[0]["source_document_ids"]
        == []
    )
    assert fake_audit_writer[0]["duration_ms"] >= 0


def test_missing_token_is_rejected():
    app.dependency_overrides.pop(
        get_current_user,
        None,
    )

    response = client.post(
        "/api/v1/ask",
        json={
            "question": "What is Project Aurora?",
        },
    )

    assert response.status_code == 401


def test_invalid_token_is_rejected():
    app.dependency_overrides.pop(
        get_current_user,
        None,
    )

    response = client.post(
        "/api/v1/ask",
        headers={
            "Authorization": "Bearer invalid-token",
        },
        json={
            "question": "What is Project Aurora?",
        },
    )

    assert response.status_code == 401