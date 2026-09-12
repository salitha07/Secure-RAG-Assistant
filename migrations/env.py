from logging.config import fileConfig

from alembic import context

from sqlmodel import SQLModel

from backend.app.database import engine
from backend.app.models.document import Document  # noqa: F401
from backend.app.models.audit_log import RagAuditLog  # noqa: F401
from backend.app.models.chat_message import ChatMessage  # noqa: F401
from backend.app.models.conversation import Conversation  # noqa: F401
from backend.app.models.user import User  # noqa: F401

config = context.config


if config.config_file_name is not None:
    fileConfig(config.config_file_name)


target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    database_url = engine.url.render_as_string(
        hide_password=False
    )

    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named",
        },
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()