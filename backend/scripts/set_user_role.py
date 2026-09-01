import argparse

from sqlmodel import Session, select

from backend.app.database import engine
from backend.app.models.role import UserRole
from backend.app.models.user import User


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Change a Secure RAG user role."
    )

    parser.add_argument(
        "email",
        help="Registered user email address.",
    )

    parser.add_argument(
        "role",
        type=str.lower,
        choices=[
            role.value for role in UserRole
        ],
        help="Role to assign to the user.",
    )

    return parser.parse_args()


def main():
    arguments = parse_arguments()

    normalized_email = (
        arguments.email.strip().lower()
    )
    selected_role = UserRole(arguments.role)

    with Session(engine) as session:
        user = session.exec(
            select(User).where(
                User.email == normalized_email
            )
        ).first()

        if user is None:
            raise SystemExit(
                f"No user found: {normalized_email}"
            )

        previous_role = user.role

        if previous_role == selected_role:
            print(
                f"{normalized_email} already has "
                f"the {selected_role.value} role."
            )
            return

        user.role = selected_role

        session.add(user)
        session.commit()

        print(
            f"Updated {normalized_email}: "
            f"{previous_role.value} "
            f"-> {selected_role.value}"
        )


if __name__ == "__main__":
    main()