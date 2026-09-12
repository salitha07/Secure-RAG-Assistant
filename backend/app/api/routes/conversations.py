from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status,
)
from sqlalchemy import func
from sqlmodel import Session, select

from backend.app.api.dependencies.auth import (
    get_current_user,
)
from backend.app.database import get_session
from backend.app.models.chat_message import ChatMessage
from backend.app.models.conversation import Conversation
from backend.app.models.user import User
from backend.app.schemas.conversation import (
    ConversationDetailResponse,
    ConversationListResponse,
)


router = APIRouter(
    prefix="/api/v1/conversations",
    tags=["Conversations"],
)


def get_role_value(user: User) -> str:
    return (
        user.role.value
        if hasattr(user.role, "value")
        else str(user.role)
    )


def get_owned_conversation(
    session: Session,
    *,
    conversation_id: UUID,
    user_id: int,
    access_role: str,
) -> Conversation:
    conversation = session.exec(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
            Conversation.access_role == access_role,
        )
    ).first()

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    return conversation


@router.get(
    "",
    response_model=ConversationListResponse,
)
def list_conversations(
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    access_role = get_role_value(current_user)

    filters = (
        Conversation.user_id == current_user.id,
        Conversation.access_role == access_role,
    )

    total = session.exec(
        select(func.count(Conversation.id)).where(
            *filters
        )
    ).one()

    conversations = session.exec(
        select(Conversation)
        .where(*filters)
        .order_by(
            Conversation.updated_at.desc(),
            Conversation.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    ).all()

    return {
        "items": conversations,
        "total": total,
    }


@router.get(
    "/{conversation_id}",
    response_model=ConversationDetailResponse,
)
def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    conversation = get_owned_conversation(
        session,
        conversation_id=conversation_id,
        user_id=current_user.id,
        access_role=get_role_value(current_user),
    )

    messages = session.exec(
        select(ChatMessage)
        .where(
            ChatMessage.conversation_id
            == conversation.id
        )
        .order_by(
            ChatMessage.created_at.asc(),
            ChatMessage.id.asc(),
        )
    ).all()

    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "messages": messages,
    }


@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    conversation = get_owned_conversation(
        session,
        conversation_id=conversation_id,
        user_id=current_user.id,
        access_role=get_role_value(current_user),
    )

    session.delete(conversation)
    session.commit()

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )