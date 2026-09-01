import pytest

from backend.app.security.passwords import (
    hash_password,
    verify_password,
)


TEST_PASSWORD = "TestPassword123!"


def test_hash_does_not_store_plain_password():
    hashed_password = hash_password(TEST_PASSWORD)

    assert hashed_password != TEST_PASSWORD
    assert TEST_PASSWORD not in hashed_password


def test_correct_password_is_verified():
    hashed_password = hash_password(TEST_PASSWORD)

    assert verify_password(
        TEST_PASSWORD,
        hashed_password,
    ) is True


def test_wrong_password_is_rejected():
    hashed_password = hash_password(TEST_PASSWORD)

    assert verify_password(
        "WrongPassword123!",
        hashed_password,
    ) is False


def test_empty_password_is_rejected():
    with pytest.raises(
        ValueError,
        match="Password cannot be empty",
    ):
        hash_password("")