import pytest
from qdrant_client import QdrantClient, models

from backend.app.models.role import UserRole
from backend.app.services.secure_retrieval import (
    normalize_role,
    search_authorized_chunks,
)
from backend.app.services.vector_store import COLLECTION_NAME


def create_test_client():
    client = QdrantClient(":memory:")

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(
            size=3,
            distance=models.Distance.COSINE,
        ),
    )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            models.PointStruct(
                id=1,
                vector=[1.0, 0.0, 0.0],
                payload={
                    "title": "Employee Handbook",
                    "allowed_roles": [
                        "employee",
                        "hr",
                        "finance",
                        "executive",
                    ],
                },
            ),
            models.PointStruct(
                id=2,
                vector=[0.9, 0.1, 0.0],
                payload={
                    "title": "HR Policy",
                    "allowed_roles": ["hr", "executive"],
                },
            ),
            models.PointStruct(
                id=3,
                vector=[0.8, 0.2, 0.0],
                payload={
                    "title": "Finance Report",
                    "allowed_roles": ["finance", "executive"],
                },
            ),
            models.PointStruct(
                id=4,
                vector=[0.7, 0.3, 0.0],
                payload={
                    "title": "Executive Strategy",
                    "allowed_roles": ["executive"],
                },
            ),
        ],
        wait=True,
    )

    return client


@pytest.mark.parametrize(
    ("role", "expected_titles"),
    [
        (
            UserRole.EMPLOYEE,
            {"Employee Handbook"},
        ),
        (
            UserRole.HR,
            {"Employee Handbook", "HR Policy"},
        ),
        (
            UserRole.FINANCE,
            {"Employee Handbook", "Finance Report"},
        ),
        (
            UserRole.EXECUTIVE,
            {
                "Employee Handbook",
                "HR Policy",
                "Finance Report",
                "Executive Strategy",
            },
        ),
    ],
)
def test_role_filter_returns_only_authorized_documents(
    monkeypatch,
    role,
    expected_titles,
):
    client = create_test_client()

    monkeypatch.setattr(
        "backend.app.services.secure_retrieval."
        "create_qdrant_client",
        lambda: client,
    )

    results = search_authorized_chunks(
        query_embedding=[1.0, 0.0, 0.0],
        user_role=role,
        limit=10,
        score_threshold=None,
    )

    returned_titles = {
        result["title"] for result in results
    }

    assert returned_titles == expected_titles


def test_threshold_removes_irrelevant_result(monkeypatch):
    client = create_test_client()

    monkeypatch.setattr(
        "backend.app.services.secure_retrieval."
        "create_qdrant_client",
        lambda: client,
    )

    results = search_authorized_chunks(
        query_embedding=[0.0, 0.0, 1.0],
        user_role=UserRole.EMPLOYEE,
        limit=10,
        score_threshold=0.60,
    )

    assert results == []


def test_normalize_role_accepts_uppercase():
    assert normalize_role("HR") == UserRole.HR


def test_invalid_role_is_rejected():
    with pytest.raises(ValueError, match="Invalid user role"):
        normalize_role("administrator")


def test_invalid_threshold_is_rejected():
    with pytest.raises(
        ValueError,
        match="Score threshold",
    ):
        search_authorized_chunks(
            query_embedding=[1.0, 0.0, 0.0],
            user_role=UserRole.EMPLOYEE,
            score_threshold=2.0,
        )