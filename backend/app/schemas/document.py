from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

class DocumentUpdateRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    title: str | None = Field(
        default=None,
        max_length=200,
    )
    department: str | None = Field(
        default=None,
        max_length=100,
    )
    allowed_roles: list[str] | None = Field(
        default=None,
        min_length=1,
    )

    @field_validator(
        "title",
        "department",
    )
    @classmethod
    def clean_text(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        cleaned_value = value.strip()

        if not cleaned_value:
            raise ValueError(
                "Value cannot be empty."
            )

        return cleaned_value

    @model_validator(mode="after")
    def require_update_field(self):
        editable_fields = (
            "title",
            "department",
            "allowed_roles",
        )

        has_value = any(
            field_name in self.model_fields_set
            and getattr(self, field_name) is not None
            for field_name in editable_fields
        )

        if not has_value:
            raise ValueError(
                "At least one update field is required."
            )

        return self

class DocumentResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    title: str
    department: str
    allowed_roles: list[str]
    original_file_name: str
    content_type: str
    file_size: int
    status: str
    error_message: str | None
    uploaded_by: int
    created_at: datetime
    updated_at: datetime


class DocumentUploadResponse(
    DocumentResponse
):
    page_count: int
    chunks_indexed: int


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int