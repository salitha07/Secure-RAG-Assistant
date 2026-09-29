import { useEffect, useState } from "react";
import {
  getUsers,
  updateUserRole,
  updateUserStatus,
} from "../services/api";

const ROLES = [
  "employee",
  "hr",
  "finance",
  "executive",
  "admin",
];

function AdminUsers() {
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
      setError(err.message || "Failed to load users.");
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

      const updatedUser = await updateUserRole(userId, newRole);

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updatedUser.id ? updatedUser : user
        )
      );
    } catch (err) {
      setError(err.message || "Failed to update user role.");
    } finally {
      setUpdatingUser(null);
    }
  }

  async function handleStatusChange(userId, currentStatus) {
    try {
      setUpdatingUser(userId);
      setError("");

      const updatedUser = await updateUserStatus(
        userId,
        !currentStatus
      );

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updatedUser.id ? updatedUser : user
        )
      );
    } catch (err) {
      setError(err.message || "Failed to update user status.");
    } finally {
      setUpdatingUser(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            User Management
          </h1>

          <p className="text-gray-600 mt-1">
            Manage user roles and account status.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-lg bg-red-100 border border-red-300 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">

          <div className="overflow-x-auto">
            <table className="w-full">

              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    ID
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Name
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Email
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Role
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Status
                  </th>

                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">

                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50"
                    >

                      {/* ID */}
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {user.id}
                      </td>

                      {/* Name */}
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {user.full_name}
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.email}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          disabled={updatingUser === user.id}
                          onChange={(event) =>
                            handleRoleChange(
                              user.id,
                              event.target.value
                            )
                          }
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {ROLES.map((role) => (
                            <option
                              key={role}
                              value={role}
                            >
                              {role.charAt(0).toUpperCase() +
                                role.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">

                        {user.is_active ? (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Inactive
                          </span>
                        )}

                      </td>

                      {/* Action */}
                      <td className="px-6 py-4">

                        <button
                          disabled={updatingUser === user.id}
                          onClick={() =>
                            handleStatusChange(
                              user.id,
                              user.is_active
                            )
                          }
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            user.is_active
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : "bg-green-600 hover:bg-green-700 text-white"
                          } disabled:opacity-50`}
                        >
                          {updatingUser === user.id
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

        </div>

        {/* Refresh */}
        <div className="mt-5">
          <button
            onClick={loadUsers}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg"
          >
            Refresh Users
          </button>
        </div>

      </div>
    </div>
  );
}

export default AdminUsers;