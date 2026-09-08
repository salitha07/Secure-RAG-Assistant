import {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  getAuditLogs,
  getCurrentUser,
  logoutUser,
} from "../services/api";

import "../styles/audit.css";


const PAGE_SIZE = 10;

const AUDIT_ROLES = [
  "executive",
  "admin",
];


function formatDate(dateValue) {
  return new Date(dateValue).toLocaleString();
}


function Audit() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAuditLogs() {
      setLoading(true);
      setError("");

      try {
        const profile = await getCurrentUser();

        if (cancelled) {
          return;
        }

        setUser(profile);

        if (!AUDIT_ROLES.includes(profile.role)) {
          setError(
            "You do not have permission to view audit logs.",
          );
          setAuditLogs([]);
          setTotal(0);
          return;
        }

        const response = await getAuditLogs({
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });

        if (cancelled) {
          return;
        }

        setAuditLogs(response.items);
        setTotal(response.total);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        if (requestError.status === 401) {
          navigate("/login", {
            replace: true,
          });
          return;
        }

        setError(requestError.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAuditLogs();

    return () => {
      cancelled = true;
    };
  }, [navigate, page]);

  function handleLogout() {
    logoutUser();
    navigate("/login", {
      replace: true,
    });
  }

  const totalPages = Math.max(
    Math.ceil(total / PAGE_SIZE),
    1,
  );

  const canViewAuditLogs =
    user && AUDIT_ROLES.includes(user.role);

  return (
    <main className="audit-page">
      <section className="audit-container">
        <header className="audit-header">
          <div>
            <p className="audit-eyebrow">
              SECURITY MONITORING
            </p>

            <h1>RAG Audit Dashboard</h1>

            <p className="audit-description">
              Review authorized RAG activity without
              exposing users&apos; original questions.
            </p>
          </div>

          <div className="audit-actions">
            <button
              className="audit-button secondary"
              type="button"
              onClick={() => navigate("/chat")}
            >
              Back to chat
            </button>

            <button
              className="audit-button danger"
              type="button"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </header>

        {user && (
          <section className="audit-profile">
            <div>
              <span>Signed in as</span>
              <strong>{user.full_name}</strong>
            </div>

            <div>
              <span>Role</span>
              <strong className="audit-role">
                {user.role}
              </strong>
            </div>

            <div>
              <span>Total records</span>
              <strong>{total}</strong>
            </div>
          </section>
        )}

        {error && (
          <div className="audit-error">
            <strong>Access unavailable</strong>
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="audit-status">
            Loading audit records...
          </div>
        )}

        {!loading
          && !error
          && canViewAuditLogs
          && (
            <>
              <div className="audit-table-wrapper">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>Role</th>
                      <th>Outcome</th>
                      <th>Sources</th>
                      <th>Duration</th>
                      <th>Question hash</th>
                    </tr>
                  </thead>

                  <tbody>
                    {auditLogs.map((audit) => (
                      <tr key={audit.request_id}>
                        <td>
                          {formatDate(audit.created_at)}
                        </td>

                        <td>#{audit.user_id}</td>

                        <td>{audit.role_used}</td>

                        <td>
                          <span
                            className={
                              `audit-outcome ${audit.outcome}`
                            }
                          >
                            {audit.outcome}
                          </span>
                        </td>

                        <td>
                          {audit.source_document_ids
                            .length > 0
                            ? audit.source_document_ids.join(
                                ", ",
                              )
                            : "None"}
                        </td>

                        <td>
                          {audit.duration_ms} ms
                        </td>

                        <td>
                          <code
                            title={audit.question_hash}
                            className="audit-hash"
                          >
                            {audit.question_hash.slice(
                              0,
                              12,
                            )}
                            ...
                          </code>
                        </td>
                      </tr>
                    ))}

                    {auditLogs.length === 0 && (
                      <tr>
                        <td
                          className="audit-empty"
                          colSpan="7"
                        >
                          No audit records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <footer className="audit-pagination">
                <button
                  className="audit-button secondary"
                  type="button"
                  disabled={page === 0}
                  onClick={() => {
                    setPage((current) => current - 1);
                  }}
                >
                  Previous
                </button>

                <span>
                  Page {page + 1} of {totalPages}
                </span>

                <button
                  className="audit-button secondary"
                  type="button"
                  disabled={
                    (page + 1) * PAGE_SIZE >= total
                  }
                  onClick={() => {
                    setPage((current) => current + 1);
                  }}
                >
                  Next
                </button>
              </footer>
            </>
          )}
      </section>
    </main>
  );
}


export default Audit;