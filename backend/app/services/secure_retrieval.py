from qdrant_client import models

from backend.app.models.role import UserRole
from backend.app.services.embedding_service import embed_query
from backend.app.services.vector_store import (
    COLLECTION_NAME,
    create_qdrant_client,
)


def normalize_role(user_role):
    if isinstance(user_role, UserRole):
        return user_role

    try:
        return UserRole(str(user_role).lower())
    except ValueError as error:
        valid_roles = [role.value for role in UserRole]

        raise ValueError(
            f"Invalid user role. Expected one of: {valid_roles}"
        ) from error


def search_authorized_chunks(
    query_embedding,
    user_role,
    limit=3,
):
    role = normalize_role(user_role)

    if limit <= 0:
        raise ValueError("Search limit must be greater than zero.")

    client = create_qdrant_client()

    try:
        response = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_embedding,
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="allowed_roles",
                        match=models.MatchValue(
                            value=role.value
                        ),
                    )
                ]
            ),
            limit=limit,
            with_payload=True,
            with_vectors=False,
        )
    finally:
        client.close()

    results = []

    for point in response.points:
        payload = dict(point.payload or {})

        results.append(
            {
                "point_id": str(point.id),
                "score": point.score,
                **payload,
            }
        )

    return results


def retrieve_authorized_chunks(
    question,
    user_role,
    limit=3,
):
    question_embedding = embed_query(question)

    return search_authorized_chunks(
        query_embedding=question_embedding,
        user_role=user_role,
        limit=limit,
    )


def main():
    question = "What is Project Aurora?"
    question_embedding = embed_query(question)

    roles_to_test = [
        UserRole.EMPLOYEE,
        UserRole.EXECUTIVE,
    ]

    print(f"Question: {question}")

    for role in roles_to_test:
        results = search_authorized_chunks(
            query_embedding=question_embedding,
            user_role=role,
            limit=4,
        )

        print(f"\nRole: {role.value}")
        print(f"Authorized results: {len(results)}")

        for result in results:
            print(
                f"- {result['title']} "
                f"| Score: {result['score']:.4f}"
            )


if __name__ == "__main__":
    main()