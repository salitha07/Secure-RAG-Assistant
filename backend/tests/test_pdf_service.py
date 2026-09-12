import pytest

from backend.app.services import pdf_service
from backend.app.services.pdf_service import (
    MAX_PDF_SIZE_BYTES,
    PdfValidationError,
    extract_pdf_text,
    validate_pdf_upload,
)


VALID_HEADER = b"%PDF-1.7\n"


class FakePage:
    def __init__(self, text):
        self.text = text

    def extract_text(self):
        return self.text


class ReadablePdfReader:
    def __init__(self, stream):
        self.is_encrypted = False
        self.pages = [
            FakePage("Employee leave policy."),
            FakePage("Employees receive annual leave."),
        ]


class EncryptedPdfReader:
    def __init__(self, stream):
        self.is_encrypted = True
        self.pages = []


class EmptyTextPdfReader:
    def __init__(self, stream):
        self.is_encrypted = False
        self.pages = [
            FakePage(""),
            FakePage(None),
        ]


def test_valid_pdf_metadata_is_accepted():
    validate_pdf_upload(
        file_name="policy.pdf",
        content_type="application/pdf",
        file_bytes=VALID_HEADER,
    )


def test_non_pdf_extension_is_rejected():
    with pytest.raises(
        PdfValidationError,
        match="Only PDF files",
    ):
        validate_pdf_upload(
            file_name="policy.txt",
            content_type="application/pdf",
            file_bytes=VALID_HEADER,
        )


def test_fake_pdf_content_is_rejected():
    with pytest.raises(
        PdfValidationError,
        match="not a valid PDF",
    ):
        validate_pdf_upload(
            file_name="policy.pdf",
            content_type="application/pdf",
            file_bytes=b"This is not a PDF.",
        )


def test_oversized_pdf_is_rejected():
    oversized_file = (
        VALID_HEADER
        + b"x" * MAX_PDF_SIZE_BYTES
    )

    with pytest.raises(
        PdfValidationError,
        match="must not exceed 10 MB",
    ):
        validate_pdf_upload(
            file_name="large.pdf",
            content_type="application/pdf",
            file_bytes=oversized_file,
        )


def test_pdf_text_is_extracted(
    monkeypatch,
):
    monkeypatch.setattr(
        pdf_service,
        "PdfReader",
        ReadablePdfReader,
    )

    text, page_count = extract_pdf_text(
        VALID_HEADER
    )

    assert page_count == 2
    assert "Employee leave policy." in text
    assert "annual leave" in text


def test_encrypted_pdf_is_rejected(
    monkeypatch,
):
    monkeypatch.setattr(
        pdf_service,
        "PdfReader",
        EncryptedPdfReader,
    )

    with pytest.raises(
        PdfValidationError,
        match="Password-protected",
    ):
        extract_pdf_text(VALID_HEADER)


def test_pdf_without_readable_text_is_rejected(
    monkeypatch,
):
    monkeypatch.setattr(
        pdf_service,
        "PdfReader",
        EmptyTextPdfReader,
    )

    with pytest.raises(
        PdfValidationError,
        match="No readable text",
    ):
        extract_pdf_text(VALID_HEADER)