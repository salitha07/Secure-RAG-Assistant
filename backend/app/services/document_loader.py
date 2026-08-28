import json
from pathlib import Path

from backend.app.models.role import UserRole


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_DIRECTORY = PROJECT_ROOT / "data"
DOCUMENT_DIRECTORY = DATA_DIRECTORY / "sample_documents"
REGISTRY_PATH = DATA_DIRECTORY / "document_registry.json"


def load_documents():
    registry_text = REGISTRY_PATH.read_text(encoding="utf-8")
    registry = json.loads(registry_text)

    valid_roles = {role.value for role in UserRole}
    loaded_documents = []

    for document_metadata in registry:
        file_name = document_metadata["file_name"]
        allowed_roles = set(document_metadata["allowed_roles"])

        invalid_roles = allowed_roles - valid_roles

        if invalid_roles:
            raise ValueError(
                f"Invalid roles in {file_name}: {sorted(invalid_roles)}"
            )

        document_path = DOCUMENT_DIRECTORY / file_name

        if not document_path.is_file():
            raise FileNotFoundError(f"Document not found: {document_path}")

        content = document_path.read_text(encoding="utf-8").strip()

        if not content:
            raise ValueError(f"Document is empty: {file_name}")

        loaded_documents.append(
            {
                **document_metadata,
                "content": content,
            }
        )

    return loaded_documents


def main():
    documents = load_documents()

    print(f"Successfully loaded {len(documents)} documents:")

    for document in documents:
        print(
            f"- {document['document_id']}: "
            f"{document['title']} "
            f"| Roles: {document['allowed_roles']}"
        )


if __name__ == "__main__":
    main()