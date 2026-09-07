import logging
from time import perf_counter

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlmodel import Session

from backend.app.api.dependencies.auth import (
    get_current_user,
)
from backend.app.database import get_session
from backend.app.models.user import User
from backend.app.schemas.rag import (
    AskRequest,
    AskResponse,
)
from backend.app.services.audit_service import (
    AuditLogWriteError,
    record_rag_audit,
)
from backend.app.services.rag_service import (
    answer_question,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/v1",
    tags=["RAG"],
)


def get_duration_ms(started_at: float) -> int:
    return max(
        int((perf_counter() - started_at) * 1000),
        0,
    )


def save_audit_or_fail(
    session: Session,
    *,
    current_user: User,
    question: str,
    outcome: str,
    source_document_ids: list[str],
    duration_ms: int,
) -> None:
    if current_user.id is None:
        logger.error(
            "Authenticated user does not have an ID."
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Request could not be securely audited.",
        )

    role_used = (
        current_user.role.value
        if hasattr(current_user.role, "value")
        else str(current_user.role)
    )

    try:
        record_rag_audit(
            session=session,
            user_id=current_user.id,
            role_used=role_used,
            question=question,
            outcome=outcome,
            source_document_ids=source_document_ids,
            duration_ms=duration_ms,
        )

    except (AuditLogWriteError, ValueError) as error:
        logger.exception("RAG audit logging failed.")

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Request could not be securely audited.",
        ) from error


@router.post(
    "/ask",
    response_model=AskResponse,
)
def ask(
    request: AskRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    started_at = perf_counter()

    try:
        result = answer_question(
            question=request.question,
            user_role=current_user.role,
        )

    except ValueError as error:
        save_audit_or_fail(
            session=session,
            current_user=current_user,
            question=request.question,
            outcome="error",
            source_document_ids=[],
            duration_ms=get_duration_ms(started_at),
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    except Exception as error:
        logger.exception("RAG request failed.")

        save_audit_or_fail(
            session=session,
            current_user=current_user,
            question=request.question,
            outcome="error",
            source_document_ids=[],
            duration_ms=get_duration_ms(started_at),
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "RAG service is temporarily unavailable."
            ),
        ) from error

    citations = result.get("citations", [])

    source_document_ids = [
        citation["document_id"]
        for citation in citations
        if citation.get("document_id")
    ]

    outcome = (
        "answered"
        if citations
        else "refused"
    )

    save_audit_or_fail(
        session=session,
        current_user=current_user,
        question=request.question,
        outcome=outcome,
        source_document_ids=source_document_ids,
        duration_ms=get_duration_ms(started_at),
    )

    return result