from datetime import datetime, timezone
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from backend.app.api.dependencies.auth import (
    get_current_user,
)
from backend.app.database import get_session
from backend.app.main import app
from backend.app.models.audit_log import RagAuditLog
from backend.app.models.role import UserRole
from backend.app.models.user import User


client = TestClient(app)


class FakeCountResult:
    def __init__(self, count: int):
        self.count = count

    def one(self):
        return self.count


class FakeAuditLogResult:
    def __init__(self, audit_logs):
        self.audit_logs = audit_logs

    def all(self):
        return self.audit_logs


class FakeAuditSession:
    def __init__(self, audit_logs):
        self.audit_logs = audit_logs
        self.exec_count = 0

    def exec(self, statement):
        self.exec_count += 1

        if self.exec_count == 1:
            return FakeCountResult(
                len(self.audit_logs)
            )

        return FakeAuditLogResult(
            self.audit_logs
        )


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


@pytest.fixture
def sample_audit_log():
    return RagAuditLog(
        id=1,
        request_id=UUID(
            "12345678-1234-5678-1234-567812345678"
        ),
        user_id=1,
        role_used="executive",
        question_hash="a" * 64,
        outcome="answered",
        source_document_ids=[
            "DOC-EXE-001",
        ],
        duration_ms=250,
        created_at=datetime(
            2026,
            9,
            8,
            10,
            30,
            tzinfo=timezone.utc,
        ),
    )


def configure_dependencies(
    role: UserRole,
    audit_logs: list[RagAuditLog],
):
    def fake_current_user():
        return User(
            id=99,
            full_name="Audit Reviewer",
            email=f"{role.value}@example.com",
            password_hash="not-used-in-this-test",
            role=role,
            is_active=True,
        )

    fake_session = FakeAuditSession(audit_logs)

    app.dependency_overrides[get_current_user] = (
        fake_current_user
    )

    app.dependency_overrides[get_session] = (
        lambda: fake_session
    )


@pytest.mark.parametrize(
    "role",
    [
        UserRole.EXECUTIVE,
        UserRole.ADMIN,
    ],
)
def test_executive_and_admin_can_view_audit_logs(
    role,
    sample_audit_log,
):
    configure_dependencies(
        role=role,
        audit_logs=[sample_audit_log],
    )

    response = client.get(
        "/api/v1/audit-logs",
        params={
            "limit": 10,
            "offset": 0,
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["total"] == 1
    assert body["limit"] == 10
    assert body["offset"] == 0
    assert len(body["items"]) == 1

    audit = body["items"][0]

    assert audit["id"] == 1
    assert audit["user_id"] == 1
    assert audit["role_used"] == "executive"
    assert audit["outcome"] == "answered"
    assert audit["source_document_ids"] == [
        "DOC-EXE-001"
    ]
    assert audit["duration_ms"] == 250


@pytest.mark.parametrize(
    "role",
    [
        UserRole.EMPLOYEE,
        UserRole.HR,
        UserRole.FINANCE,
    ],
)
def test_other_roles_cannot_view_audit_logs(
    role,
    sample_audit_log,
):
    configure_dependencies(
        role=role,
        audit_logs=[sample_audit_log],
    )

    response = client.get(
        "/api/v1/audit-logs"
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": (
            "You do not have permission "
            "to view audit logs."
        )
    }


def test_missing_token_cannot_view_audit_logs():
    fake_session = FakeAuditSession([])

    app.dependency_overrides[get_session] = (
        lambda: fake_session
    )

    response = client.get(
        "/api/v1/audit-logs"
    )

    assert response.status_code == 401