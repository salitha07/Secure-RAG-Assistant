from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "Secure RAG Assistant",
    }


def test_ask_endpoint_returns_answer(monkeypatch):
    captured_request = {}

    def fake_answer_question(question, user_role):
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
                    "chunk_id": "DOC-EXE-001-CHUNK-001",
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
            "role": "executive",
        },
    )

    assert response.status_code == 200
    assert response.json()["citations"][0]["title"] == (
        "Executive Strategy"
    )
    assert captured_request == {
        "question": "What is Project Aurora?",
        "role": "executive",
    }


def test_invalid_role_returns_validation_error():
    response = client.post(
        "/api/v1/ask",
        json={
            "question": "What is Project Aurora?",
            "role": "manager",
        },
    )

    assert response.status_code == 422


def test_empty_question_returns_validation_error():
    response = client.post(
        "/api/v1/ask",
        json={
            "question": "",
            "role": "employee",
        },
    )

    assert response.status_code == 422


def test_service_failure_returns_safe_error(monkeypatch):
    def fake_failure(question, user_role):
        raise RuntimeError("Simulated internal failure.")

    monkeypatch.setattr(
        "backend.app.api.routes.rag.answer_question",
        fake_failure,
    )

    response = client.post(
        "/api/v1/ask",
        json={
            "question": "What is Project Aurora?",
            "role": "executive",
        },
    )

    assert response.status_code == 503
    assert response.json() == {
        "detail": "RAG service is temporarily unavailable."
    }