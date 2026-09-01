from pydantic import BaseModel, Field

from backend.app.models.role import UserRole


class AskRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=1000,
    )
    role: UserRole


class CitationResponse(BaseModel):
    source_number: int
    title: str
    document_id: str
    chunk_id: str
    score: float


class AskResponse(BaseModel):
    answer: str
    citations: list[CitationResponse]