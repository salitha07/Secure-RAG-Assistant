import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import useTheme from "../hooks/useTheme";

import {
  getCurrentUser,
  logoutUser,
} from "../services/api";

import "../styles/app-layout.css";

const AUDIT_ROLES = ["executive", "admin"];
const DOCUMENT_ROLES = ["executive", "admin"];

function getInitials(name) {
  if (!name) return "U";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatRole(role) {
  if (!role) return "Loading...";

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatHistoryDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const messageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const difference =
    (today - messageDate) / (1000 * 60 * 60 * 24);

  if (difference === 0) {
    return "Today";
  }

  if (difference === 1) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function getConversationTitle(conversation) {
  return (
    conversation?.title ||
    conversation?.name ||
    conversation?.first_question ||
    conversation?.firstQuestion ||
    conversation?.question ||
    "New conversation"
  );
}

function getConversationDate(conversation) {
  return (
    conversation?.updated_at ||
    conversation?.updatedAt ||
    conversation?.created_at ||
    conversation?.createdAt
  );
}

function groupConversations(conversations) {
  const groups = {};

  conversations.forEach((conversation) => {
    const date = getConversationDate(conversation);
    const label = formatHistoryDate(date) || "Older";

    if (!groups[label]) {
      groups[label] = [];
    }

    groups[label].push(conversation);
  });

  return groups;
}

function AppLayout({
  children,

  // Chat history props
  conversations = [],
  activeConversationId = null,
  onOpenConversation,
  onNewConversation,
  onDeleteConversation,
}) {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((profile) => {
        if (active) {
          setUser(profile);
        }
      })
      .catch((error) => {
        if (error.status === 401) {
          navigate("/login", { replace: true });
        }
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const canViewAudit =
    user && AUDIT_ROLES.includes(user.role);

  const canManageDocuments =
    user && DOCUMENT_ROLES.includes(user.role);

  const canManageUsers =
    user && user.role === "admin";

  const groupedConversations =
    groupConversations(conversations);

  function handleLogout() {
    logoutUser();

    navigate("/login", {
      replace: true,
    });
  }

  function handleConversationClick(id) {
    if (onOpenConversation) {
      onOpenConversation(id);
    }
  }

  function handleDeleteClick(event, id) {
    event.stopPropagation();

    if (onDeleteConversation) {
      onDeleteConversation(id);
    }
  }

  return (
    <div className="app-layout">

      {/* ========================================
          SIDEBAR
      ======================================== */}
      <aside className="app-sidebar">

        {/* Brand */}
        <div className="app-brand">
          <div className="app-brand-icon">
            S
          </div>

          <div>
            <strong>Secure RAG</strong>
            <span>Knowledge Assistant</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="app-navigation">

          <p className="app-nav-label">
            WORKSPACE
          </p>

          <NavLink
            to="/chat"
            className={({ isActive }) =>
              `app-nav-link ${
                isActive ? "active" : ""
              }`
            }
          >
            <span className="app-nav-icon">
              💬
            </span>

            Chat
          </NavLink>

          {canManageDocuments && (
            <NavLink
              to="/documents"
              className={({ isActive }) =>
                `app-nav-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span className="app-nav-icon">
                📄
              </span>

              Documents
            </NavLink>
          )}

          {canViewAudit && (
            <NavLink
              to="/audit"
              className={({ isActive }) =>
                `app-nav-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span className="app-nav-icon">
                ✓
              </span>

              Audit Dashboard
            </NavLink>
          )}
          {/* Admin section */}
          {canManageUsers && (
            <>
              <p className="app-nav-label app-admin-label">
                ADMINISTRATION
              </p>

              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `app-nav-link ${
                    isActive ? "active" : ""
                  }`
                }
              >
                <span className="app-nav-icon">
                  👥
                </span>

                User Management
              </NavLink>
            </>
          )}

        </nav>

          {/* ========================================
              CHAT HISTORY
          ======================================== */}

          <div className="app-history-section">

            <div className="app-history-header">

              <p className="app-nav-label">
                CHAT HISTORY
              </p>

              <button
                type="button"
                className="app-history-toggle"
                onClick={() =>
                  setHistoryOpen((value) => !value)
                }
                title={
                  historyOpen
                    ? "Hide chat history"
                    : "Show chat history"
                }
              >
                {historyOpen ? "−" : "+"}
              </button>

            </div>

            {historyOpen && (
              <div className="app-history-content">

                {/* New conversation */}
                <button
                  type="button"
                  className="app-new-chat-button"
                  onClick={() => {
                    if (onNewConversation) {
                      onNewConversation();
                    }

                    navigate("/chat");
                  }}
                >
                  <span>＋</span>
                  New conversation
                </button>

                {/* No history */}
                {conversations.length === 0 && (
                  <div className="app-history-empty">
                    <span>💬</span>
                    <p>No conversations yet</p>
                  </div>
                )}

                {/* History groups */}
                {Object.entries(
                  groupedConversations
                ).map(
                  ([groupName, groupConversations]) => (
                    <div
                      className="app-history-group"
                      key={groupName}
                    >
                      <div className="app-history-group-title">
                        {groupName}
                      </div>

                      {groupConversations.map(
                        (conversation) => {
                          const conversationId =
                            conversation.id;

                          const isActive =
                            String(
                              activeConversationId
                            ) ===
                            String(conversationId);

                          return (
                            <div
                              key={conversationId}
                              className={`app-history-item ${
                                isActive
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() =>
                                handleConversationClick(
                                  conversationId
                                )
                              }
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (
                                  event.key ===
                                  "Enter"
                                ) {
                                  handleConversationClick(
                                    conversationId
                                  );
                                }
                              }}
                            >
                              <span className="app-history-item-icon">
                                💬
                              </span>

                              <span className="app-history-item-title">
                                {getConversationTitle(
                                  conversation
                                )}
                              </span>

                              {onDeleteConversation && (
                                <button
                                  type="button"
                                  className="app-history-delete"
                                  title="Delete conversation"
                                  onClick={(event) =>
                                    handleDeleteClick(
                                      event,
                                      conversationId
                                    )
                                  }
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          

        {/* Security panel */}
        <div className="app-security-panel">

          <span className="app-security-dot" />

          <div>
            <strong>
              Role protection active
            </strong>

            <p>
              Access is controlled by your
              verified role.
            </p>
          </div>

        </div>

        {/* User profile */}
        <div className="app-profile">

          <div className="app-profile-avatar">
            {getInitials(user?.full_name)}
          </div>

          <div className="app-profile-info">

            <strong>
              {user?.full_name ||
                "Loading profile"}
            </strong>

            <span>
              {user?.email ||
                "Please wait..."}
            </span>

            <small>
              {formatRole(user?.role)}
              {" "}access
            </small>

          </div>

        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />

        {/* Logout */}
        <button
          type="button"
          className="app-logout-button"
          onClick={handleLogout}
        >
          Sign out
        </button>

      </aside>

      {/* ========================================
          PAGE CONTENT
      ======================================== */}

      <section className="app-content">
        {children}
      </section>

    </div>
  );
}

export default AppLayout;