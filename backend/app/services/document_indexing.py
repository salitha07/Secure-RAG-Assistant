from uuid import NAMESPACE_URL, uuid4, uuid5

from qdrant_client import models

from backend.app.models.role import UserRole
from backend.app.services.embedding_service import (
    embed_document,
)
from backend.app.services.text_chunker import split_text
from backend.app.services.vector_store import (
    COLLECTION_NAME,
    create_qdrant_client,
    ensure_collection,
)


def normalize_allowed_roles(
    allowed_roles: list[str | UserRole],
) -> list[str]:
    valid_roles = {
        role.value
        for role in UserRole
    }

    normalized_roles = []

    for role in allowed_roles:
        if isinstance(role, UserRole):
            role_value = role.value
        else:
            role_value = str(role).strip().lower()

        if role_value not in valid_roles:
            raise ValueError(
                f"Invalid document role: {role_value}"
            )

        if role_value not in normalized_roles:
            normalized_roles.append(role_value)

    if not normalized_roles:
        raise ValueError(
            "At least one allowed role is required."
        )

    return normalized_roles


def create_dynamic_chunks(
    *,
    document_id: str,
    title: str,
    department: str,
    allowed_roles: list[str],
    text: str,
) -> list[dict]:
    if not title.strip():
        raise ValueError(
            "Document title cannot be empty."
        )

    if not department.strip():
        raise ValueError(
            "Department cannot be empty."
        )

    text_chunks = split_text(text)

    if not text_chunks:
        raise ValueError(
            "Document text did not produce any chunks."
        )

    return [
        {
            "chunk_id": (
                f"{document_id}-CHUNK-{index:03d}"
            ),
            "document_id": document_id,
            "title": title.strip(),
            "department": department.strip(),
            "allowed_roles": allowed_roles,
            "content": chunk_text,
        }
        for index, chunk_text in enumerate(
            text_chunks,
            start=1,
        )
    ]


def create_dynamic_point(
    *,
    chunk: dict,
    index_version: str,
) -> models.PointStruct:
    embedding = embed_document(
        text=chunk["content"],
        title=chunk["title"],
    )

    point_id = str(
        uuid5(
            NAMESPACE_URL,
            (
                "secure-rag-assistant/"
                f"{chunk['chunk_id']}/"
                f"{index_version}"
            ),
        )
    )

    return models.PointStruct(
        id=point_id,
        vector=embedding,
        payload={
            **chunk,
            "index_version": index_version,
        },
    )


def index_document(
    *,
    document_id,
    title: str,
    department: str,
    allowed_roles: list[str | UserRole],
    text: str,
) -> int:
    normalized_roles = normalize_allowed_roles(
        allowed_roles
    )

    document_id_text = str(document_id)

    chunks = create_dynamic_chunks(
        document_id=document_id_text,
        title=title,
        department=department,
        allowed_roles=normalized_roles,
        text=text,
    )

    index_version = str(uuid4())

    points = [
        create_dynamic_point(
            chunk=chunk,
            index_version=index_version,
        )
        for chunk in chunks
    ]

    client = create_qdrant_client()

    try:
        ensure_collection(client)

        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points,
            wait=True,
        )

        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="document_id",
                            match=models.MatchValue(
                                value=document_id_text
                            ),
                        )
                    ],
                    must_not=[
                        models.FieldCondition(
                            key="index_version",
                            match=models.MatchValue(
                                value=index_version
                            ),
                        )
                    ],
                )
            ),
            wait=True,
        )

    finally:
        client.close()

    return len(points)


def delete_document_index(
    document_id,
) -> None:
    client = create_qdrant_client()

    try:
        ensure_collection(client)

        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="document_id",
                            match=models.MatchValue(
                                value=str(document_id)
                            ),
                        )
                    ]
                )
            ),
            wait=True,
        )

    finally:
        client.close()