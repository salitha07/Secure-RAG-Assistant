from enum import Enum


class UserRole(str, Enum):
    EMPLOYEE = "employee"
    HR = "hr"
    FINANCE = "finance"
    EXECUTIVE = "executive"