from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from backend.app.schemas.rag import CitationResponse


class ConversationSummaryResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    role: str
    content: str
    citations: list[CitationResponse]
    created_at: datetime


class ConversationDetailResponse(
    ConversationSummaryResponse
):
    messages: list[ChatMessageResponse]


class ConversationListResponse(BaseModel):
    items: list[ConversationSummaryResponse]
    total: int