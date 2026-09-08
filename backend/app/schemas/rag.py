from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class AskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(
        min_length=1,
        max_length=1000,
    )

    conversation_id: UUID | None = None


class CitationResponse(BaseModel):
    source_number: int
    title: str
    document_id: str
    chunk_id: str
    score: float


class AskResponse(BaseModel):
    conversation_id: UUID
    answer: str
    citations: list[CitationResponse]