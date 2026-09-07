import hashlib

from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from backend.app.models.audit_log import RagAuditLog


VALID_OUTCOMES = {
    "answered",
    "refused",
    "error",
}


class AuditLogWriteError(RuntimeError):
    pass


def hash_question(question: str) -> str:
    normalized_question = " ".join(
        question.strip().split()
    )

    return hashlib.sha256(
        normalized_question.encode("utf-8")
    ).hexdigest()


def record_rag_audit(
    session: Session,
    *,
    user_id: int,
    role_used: str,
    question: str,
    outcome: str,
    source_document_ids: list[str],
    duration_ms: int,
) -> RagAuditLog:
    if outcome not in VALID_OUTCOMES:
        raise ValueError("Invalid audit outcome.")

    unique_document_ids = list(
        dict.fromkeys(source_document_ids)
    )

    audit_log = RagAuditLog(
        user_id=user_id,
        role_used=role_used,
        question_hash=hash_question(question),
        outcome=outcome,
        source_document_ids=unique_document_ids,
        duration_ms=max(duration_ms, 0),
    )

    try:
        session.add(audit_log)
        session.commit()
        session.refresh(audit_log)

    except SQLAlchemyError as error:
        session.rollback()

        raise AuditLogWriteError(
            "Could not write the RAG audit log."
        ) from error

    return audit_log