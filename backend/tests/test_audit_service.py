from unittest.mock import Mock

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.pool import StaticPool
from sqlmodel import (
    Session,
    SQLModel,
    create_engine,
)

from backend.app.models.audit_log import RagAuditLog
from backend.app.models.role import UserRole
from backend.app.models.user import User
from backend.app.services.audit_service import (
    AuditLogWriteError,
    hash_question,
    record_rag_audit,
)


@pytest.fixture
def database_session():
    test_engine = create_engine(
        "sqlite://",
        connect_args={
            "check_same_thread": False,
        },
        poolclass=StaticPool,
    )

    SQLModel.metadata.create_all(test_engine)

    with Session(test_engine) as session:
        user = User(
            full_name="Audit Test User",
            email="audit@example.com",
            password_hash="test-password-hash",
            role=UserRole("executive"),
            is_active=True,
        )

        session.add(user)
        session.commit()
        session.refresh(user)

        yield session, user

    SQLModel.metadata.drop_all(test_engine)


def test_question_hash_is_private_and_repeatable():
    first_hash = hash_question(
        "What is Project Aurora?"
    )

    second_hash = hash_question(
        "  What   is Project Aurora?  "
    )

    assert first_hash == second_hash
    assert len(first_hash) == 64
    assert "Project Aurora" not in first_hash


def test_audit_log_is_saved(
    database_session,
):
    session, user = database_session

    audit_log = record_rag_audit(
        session=session,
        user_id=user.id,
        role_used="executive",
        question="What is Project Aurora?",
        outcome="answered",
        source_document_ids=[
            "DOC-EXE-001",
            "DOC-EXE-001",
        ],
        duration_ms=250,
    )

    assert audit_log.id is not None
    assert audit_log.user_id == user.id
    assert audit_log.role_used == "executive"
    assert audit_log.outcome == "answered"
    assert audit_log.source_document_ids == [
        "DOC-EXE-001"
    ]
    assert audit_log.duration_ms == 250

    stored_log = session.get(
        RagAuditLog,
        audit_log.id,
    )

    assert stored_log is not None
    assert stored_log.question_hash == hash_question(
        "What is Project Aurora?"
    )


def test_invalid_outcome_is_rejected(
    database_session,
):
    session, user = database_session

    with pytest.raises(
        ValueError,
        match="Invalid audit outcome",
    ):
        record_rag_audit(
            session=session,
            user_id=user.id,
            role_used="executive",
            question="Test question",
            outcome="unknown",
            source_document_ids=[],
            duration_ms=10,
        )


def test_database_error_is_safely_wrapped():
    fake_session = Mock(spec=Session)
    fake_session.commit.side_effect = SQLAlchemyError(
        "Simulated database error."
    )

    with pytest.raises(AuditLogWriteError):
        record_rag_audit(
            session=fake_session,
            user_id=1,
            role_used="employee",
            question="Test question",
            outcome="refused",
            source_document_ids=[],
            duration_ms=10,
        )

    fake_session.rollback.assert_called_once()