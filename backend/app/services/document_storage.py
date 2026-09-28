from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOAD_DIRECTORY = PROJECT_ROOT / "data" / "uploads"


def get_document_path(
    stored_file_name: str,
) -> Path:
    safe_file_name = Path(
        stored_file_name
    ).name

    if safe_file_name != stored_file_name:
        raise ValueError(
            "Invalid stored file name."
        )

    return UPLOAD_DIRECTORY / safe_file_name


def save_document_file(
    *,
    stored_file_name: str,
    file_bytes: bytes,
) -> Path:
    if not file_bytes:
        raise ValueError(
            "Document file cannot be empty."
        )

    UPLOAD_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    document_path = get_document_path(
        stored_file_name
    )

    temporary_path = (
        UPLOAD_DIRECTORY
        / f".{stored_file_name}.tmp"
    )

    try:
        temporary_path.write_bytes(
            file_bytes
        )

        temporary_path.replace(
            document_path
        )

    finally:
        temporary_path.unlink(
            missing_ok=True
        )

    return document_path


def delete_document_file(
    stored_file_name: str,
) -> None:
    document_path = get_document_path(
        stored_file_name
    )

    document_path.unlink(
        missing_ok=True
    )