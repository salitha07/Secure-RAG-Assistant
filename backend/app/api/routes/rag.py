import logging
from time import perf_counter
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlmodel import Session, select

from backend.app.api.dependencies.auth import (
    get_current_user,
)
from backend.app.database import get_session
from backend.app.models.chat_message import ChatMessage
from backend.app.models.conversation import (
    Conversation,
    utc_now,
)
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


def create_conversation_title(
    question: str,
    max_length: int = 60,
) -> str:
    title = " ".join(question.strip().split())

    if len(title) <= max_length:
        return title

    return f"{title[:max_length - 3].rstrip()}..."


def get_owned_conversation(
    session: Session,
    *,
    conversation_id: UUID,
    user_id: int,
) -> Conversation:
    conversation = session.exec(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    ).first()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    return conversation


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

    if current_user.id is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authenticated user is invalid.",
        )

    conversation = None

    if request.conversation_id is not None:
        conversation = get_owned_conversation(
            session,
            conversation_id=request.conversation_id,
            user_id=current_user.id,
        )

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

    if conversation is None:
        conversation = Conversation(
            user_id=current_user.id,
            title=create_conversation_title(
                request.question
            ),
        )

        session.add(conversation)

    conversation.updated_at = utc_now()

    user_message = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=request.question.strip(),
        citations=[],
    )

    assistant_message = ChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=result["answer"],
        citations=citations,
    )

    session.add(conversation)
    session.add(user_message)
    session.add(assistant_message)

    # record_rag_audit commits the audit log,
    # conversation and both chat messages together.
    save_audit_or_fail(
        session=session,
        current_user=current_user,
        question=request.question,
        outcome=outcome,
        source_document_ids=source_document_ids,
        duration_ms=get_duration_ms(started_at),
    )

    return {
        "conversation_id": conversation.id,
        "answer": result["answer"],
        "citations": citations,
    }