import AppLayout from "../components/AppLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getUsers,
  updateUserRole,
  updateUserStatus,
} from "../services/api";

import "../styles/admin-users.css";

const ROLES = [
  "employee",
  "hr",
  "finance",
  "executive",
  "admin",
];

function formatRole(role) {
  if (!role) {
    return "Unknown";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getInitials(name) {
  if (!name) {
    return "U";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingUser, setUpdatingUser] = useState(null);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      if (err.status === 401) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      if (err.status === 403) {
        setError(
          "You do not have permission to access user management.",
        );
        return;
      }

      setError(
        err.message || "Failed to load users.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleRoleChange(userId, newRole) {
    try {
      setUpdatingUser(userId);
      setError("");

      const updatedUser = await updateUserRole(
        userId,
        newRole,
      );

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updatedUser.id
            ? updatedUser
            : user,
        ),
      );
    } catch (err) {
      if (err.status === 401) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      setError(
        err.message || "Failed to update user role.",
      );
    } finally {
      setUpdatingUser(null);
    }
  }

  async function handleStatusChange(
    userId,
    currentStatus,
  ) {
    try {
      setUpdatingUser(userId);
      setError("");

      const updatedUser = await updateUserStatus(
        userId,
        !currentStatus,
      );

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updatedUser.id
            ? updatedUser
            : user,
        ),
      );
    } catch (err) {
      if (err.status === 401) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      setError(
        err.message || "Failed to update user status.",
      );
    } finally {
      setUpdatingUser(null);
    }
  }

  const activeUsers = users.filter(
    (user) => user.is_active,
  ).length;

  const inactiveUsers = users.filter(
    (user) => !user.is_active,
  ).length;

  const adminUsers = users.filter(
    (user) => user.role === "admin",
  ).length;

  return (
    <AppLayout>
      <main className="admin-users-page">

        {/* Loading */}
        {loading ? (
          <div className="admin-users-loading">
            <div className="admin-loading-spinner" />

            <p>
              Loading user management...
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="admin-users-header">

              <div className="admin-users-heading">

                <button
                  type="button"
                  className="admin-back-button"
                  onClick={() => navigate("/chat")}
                >
                  ← Back to workspace
                </button>

                <p className="admin-eyebrow">
                  ADMINISTRATION
                </p>

                <h1>
                  User Management
                </h1>

                <p className="admin-description">
                  Manage users, roles, and account
                  access across the Secure RAG
                  workspace.
                </p>

              </div>

              <div className="admin-security-badge">

                <span className="admin-security-dot" />

                <div>
                  <strong>
                    Admin access
                  </strong>

                  <span>
                    Protected management area
                  </span>
                </div>

              </div>

            </header>

            {/* Statistics */}
            <section className="admin-stats">

              <div className="admin-stat-card">

                <div className="admin-stat-icon">
                  U
                </div>

                <div>
                  <span>
                    Total users
                  </span>

                  <strong>
                    {users.length}
                  </strong>
                </div>

              </div>

              <div className="admin-stat-card">

                <div className="admin-stat-icon green">
                  ✓
                </div>

                <div>
                  <span>
                    Active users
                  </span>

                  <strong>
                    {activeUsers}
                  </strong>
                </div>

              </div>

              <div className="admin-stat-card">

                <div className="admin-stat-icon yellow">
                  A
                </div>

                <div>
                  <span>
                    Administrators
                  </span>

                  <strong>
                    {adminUsers}
                  </strong>
                </div>

              </div>

              <div className="admin-stat-card">

                <div className="admin-stat-icon red">
                  !
                </div>

                <div>
                  <span>
                    Inactive
                  </span>

                  <strong>
                    {inactiveUsers}
                  </strong>
                </div>

              </div>

            </section>

            {/* Error */}
            {error && (
              <div className="admin-error">

                <span>!</span>

                <div>
                  <strong>
                    Something went wrong
                  </strong>

                  <p>
                    {error}
                  </p>
                </div>

              </div>
            )}

            {/* User management */}
            <section className="admin-users-card">

              <div className="admin-users-card-header">

                <div>
                  <h2>
                    Workspace users
                  </h2>

                  <p>
                    Change roles or control account
                    access.
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-refresh-button"
                  onClick={loadUsers}
                  disabled={
                    loading ||
                    updatingUser !== null
                  }
                >
                  ↻ Refresh
                </button>

              </div>

              <div className="admin-table-wrapper">

                <table className="admin-users-table">

                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Access</th>
                    </tr>
                  </thead>

                  <tbody>

                    {users.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
                          className="admin-empty"
                        >
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>

                          {/* User */}
                          <td>
                            <div className="admin-user-cell">

                              <div className="admin-avatar">
                                {getInitials(
                                  user.full_name,
                                )}
                              </div>

                              <div>
                                <strong>
                                  {user.full_name}
                                </strong>

                                <span>
                                  User ID #{user.id}
                                </span>
                              </div>

                            </div>
                          </td>

                          {/* Email */}
                          <td>
                            <span className="admin-email">
                              {user.email}
                            </span>
                          </td>

                          {/* Role */}
                          <td>
                            <select
                              value={user.role}
                              disabled={
                                updatingUser ===
                                user.id
                              }
                              onChange={(event) =>
                                handleRoleChange(
                                  user.id,
                                  event.target.value,
                                )
                              }
                              className="admin-role-select"
                            >
                              {ROLES.map((role) => (
                                <option
                                  key={role}
                                  value={role}
                                >
                                  {formatRole(role)}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Status */}
                          <td>
                            {user.is_active ? (
                              <span className="admin-status active">
                                <span />
                                Active
                              </span>
                            ) : (
                              <span className="admin-status inactive">
                                <span />
                                Inactive
                              </span>
                            )}
                          </td>

                          {/* Access */}
                          <td>
                            <button
                              type="button"
                              className={
                                user.is_active
                                  ? "admin-access-button deactivate"
                                  : "admin-access-button activate"
                              }
                              disabled={
                                updatingUser ===
                                user.id
                              }
                              onClick={() =>
                                handleStatusChange(
                                  user.id,
                                  user.is_active,
                                )
                              }
                            >
                              {updatingUser ===
                              user.id
                                ? "Updating..."
                                : user.is_active
                                  ? "Deactivate"
                                  : "Activate"}
                            </button>
                          </td>

                        </tr>
                      ))
                    )}

                  </tbody>

                </table>

              </div>

            </section>

            {/* Security information */}
            <section className="admin-security-info">

              <div className="admin-security-info-icon">
                ✓
              </div>

              <div>
                <strong>
                  Role-based access control
                </strong>

                <p>
                  User permissions are enforced by
                  the backend. Changing a role updates
                  the user's access to authorized
                  company documents.
                </p>
              </div>

            </section>
          </>
        )}

      </main>
    </AppLayout>
  );
}

export default AdminUsers;