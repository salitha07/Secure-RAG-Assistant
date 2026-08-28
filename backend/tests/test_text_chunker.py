import pytest

from backend.app.services.text_chunker import (
    chunk_documents,
    split_text,
)


def test_short_text_creates_one_chunk():
    chunks = split_text(
        "This is a short company policy.",
        chunk_size=10,
        overlap=2,
    )

    assert chunks == ["This is a short company policy."]


def test_chunks_include_correct_overlap():
    text = "one two three four five six seven eight nine"

    chunks = split_text(
        text,
        chunk_size=5,
        overlap=2,
    )

    assert chunks == [
        "one two three four five",
        "four five six seven eight",
        "seven eight nine",
    ]


def test_invalid_overlap_raises_error():
    with pytest.raises(ValueError):
        split_text(
            "Example text",
            chunk_size=5,
            overlap=5,
        )


def test_chunk_preserves_security_metadata():
    documents = [
        {
            "document_id": "DOC-HR-001",
            "title": "HR Policy",
            "department": "hr",
            "allowed_roles": ["hr", "executive"],
            "content": "Confidential employee information.",
        }
    ]

    chunks = chunk_documents(documents)

    assert len(chunks) == 1
    assert chunks[0]["chunk_id"] == "DOC-HR-001-CHUNK-001"
    assert chunks[0]["allowed_roles"] == ["hr", "executive"]
    assert chunks[0]["department"] == "hr"