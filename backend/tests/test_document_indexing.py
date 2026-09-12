import pytest

from backend.app.models.role import UserRole
from backend.app.services import document_indexing
from backend.app.services.document_indexing import (
    create_dynamic_chunks,
    delete_document_index,
    index_document,
    normalize_allowed_roles,
)


class FakeQdrantClient:
    def __init__(self):
        self.upsert_calls = []
        self.delete_calls = []
        self.closed = False

    def upsert(self, **kwargs):
        self.upsert_calls.append(kwargs)

    def delete(self, **kwargs):
        self.delete_calls.append(kwargs)

    def close(self):
        self.closed = True


def configure_fake_qdrant(
    monkeypatch,
    fake_client,
):
    monkeypatch.setattr(
        document_indexing,
        "create_qdrant_client",
        lambda: fake_client,
    )

    monkeypatch.setattr(
        document_indexing,
        "ensure_collection",
        lambda client: None,
    )

    monkeypatch.setattr(
        document_indexing,
        "embed_document",
        lambda text, title: [0.1, 0.2, 0.3],
    )


def test_roles_are_normalized_and_deduplicated():
    result = normalize_allowed_roles(
        [
            "EMPLOYEE",
            UserRole.HR,
            "employee",
        ]
    )

    assert result == [
        "employee",
        "hr",
    ]


def test_invalid_role_is_rejected():
    with pytest.raises(
        ValueError,
        match="Invalid document role",
    ):
        normalize_allowed_roles(
            ["unknown-role"]
        )


def test_dynamic_chunks_preserve_metadata():
    chunks = create_dynamic_chunks(
        document_id="document-123",
        title="Leave Policy",
        department="HR",
        allowed_roles=[
            "employee",
            "hr",
        ],
        text=" ".join(
            f"word-{index}"
            for index in range(100)
        ),
    )

    assert len(chunks) == 2

    assert chunks[0]["document_id"] == (
        "document-123"
    )

    assert chunks[0]["title"] == (
        "Leave Policy"
    )

    assert chunks[0]["department"] == "HR"

    assert chunks[0]["allowed_roles"] == [
        "employee",
        "hr",
    ]

    assert chunks[0]["chunk_id"] == (
        "document-123-CHUNK-001"
    )


def test_document_is_indexed(
    monkeypatch,
):
    fake_client = FakeQdrantClient()

    configure_fake_qdrant(
        monkeypatch,
        fake_client,
    )

    chunk_count = index_document(
        document_id="document-123",
        title="Leave Policy",
        department="HR",
        allowed_roles=[
            "employee",
            "hr",
        ],
        text=" ".join(
            f"word-{index}"
            for index in range(100)
        ),
    )

    assert chunk_count == 2
    assert len(fake_client.upsert_calls) == 1
    assert len(fake_client.delete_calls) == 1
    assert fake_client.closed is True

    points = fake_client.upsert_calls[0][
        "points"
    ]

    assert len(points) == 2

    assert points[0].payload[
        "document_id"
    ] == "document-123"

    assert points[0].payload[
        "allowed_roles"
    ] == [
        "employee",
        "hr",
    ]

    assert points[0].payload[
        "index_version"
    ]


def test_document_index_is_deleted(
    monkeypatch,
):
    fake_client = FakeQdrantClient()

    configure_fake_qdrant(
        monkeypatch,
        fake_client,
    )

    delete_document_index(
        "document-123"
    )

    assert len(fake_client.delete_calls) == 1
    assert fake_client.closed is True