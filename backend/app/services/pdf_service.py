from io import BytesIO
from pathlib import Path

from pypdf import PdfReader
from pypdf.errors import PdfReadError


MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024
MAX_PDF_PAGES = 200

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/octet-stream",
}


class PdfValidationError(ValueError):
    pass


def validate_pdf_upload(
    *,
    file_name: str,
    content_type: str | None,
    file_bytes: bytes,
) -> None:
    if not file_name.strip():
        raise PdfValidationError(
            "A file name is required."
        )

    if Path(file_name).suffix.lower() != ".pdf":
        raise PdfValidationError(
            "Only PDF files are allowed."
        )

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise PdfValidationError(
            "The uploaded file has an invalid content type."
        )

    if not file_bytes:
        raise PdfValidationError(
            "The uploaded PDF is empty."
        )

    if len(file_bytes) > MAX_PDF_SIZE_BYTES:
        raise PdfValidationError(
            "The PDF must not exceed 10 MB."
        )

    if b"%PDF-" not in file_bytes[:1024]:
        raise PdfValidationError(
            "The uploaded file is not a valid PDF."
        )


def extract_pdf_text(
    file_bytes: bytes,
) -> tuple[str, int]:
    try:
        reader = PdfReader(BytesIO(file_bytes))
    except (
        PdfReadError,
        OSError,
        ValueError,
    ) as error:
        raise PdfValidationError(
            "The PDF could not be read."
        ) from error

    if reader.is_encrypted:
        raise PdfValidationError(
            "Password-protected PDFs are not supported."
        )

    try:
        page_count = len(reader.pages)

        if page_count == 0:
            raise PdfValidationError(
                "The PDF does not contain any pages."
            )

        if page_count > MAX_PDF_PAGES:
            raise PdfValidationError(
                "The PDF must not exceed 200 pages."
            )

        page_texts = []

        for page in reader.pages:
            extracted_text = page.extract_text() or ""
            extracted_text = extracted_text.strip()

            if extracted_text:
                page_texts.append(extracted_text)

    except PdfValidationError:
        raise

    except (
        PdfReadError,
        OSError,
        ValueError,
    ) as error:
        raise PdfValidationError(
            "Text could not be extracted from the PDF."
        ) from error

    complete_text = "\n\n".join(page_texts).strip()

    if not complete_text:
        raise PdfValidationError(
            "No readable text was found in the PDF."
        )

    return complete_text, page_count


def process_pdf_upload(
    *,
    file_name: str,
    content_type: str | None,
    file_bytes: bytes,
) -> dict:
    validate_pdf_upload(
        file_name=file_name,
        content_type=content_type,
        file_bytes=file_bytes,
    )

    text, page_count = extract_pdf_text(
        file_bytes
    )

    return {
        "text": text,
        "page_count": page_count,
        "file_size": len(file_bytes),
    }