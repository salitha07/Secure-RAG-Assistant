import os


os.environ.setdefault(
    "DATABASE_URL",
    "sqlite:///:memory:",
)

os.environ.setdefault(
    "JWT_SECRET",
    "test-only-secret-with-more-than-32-characters",
)

os.environ.setdefault(
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "30",
)