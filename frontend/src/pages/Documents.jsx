import AppLayout from "../components/AppLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getCurrentUser,
  getDocuments,
  uploadDocument,
  updateDocument,
  replaceDocumentPdf,
  deleteDocument,
} from "../services/api";

import "../styles/documents.css";

const MANAGEMENT_ROLES = [
  "executive",
  "admin",
];

const AVAILABLE_ROLES = [
  {
    value: "employee",
    label: "Employee",
  },
  {
    value: "hr",
    label: "HR",
  },
  {
    value: "finance",
    label: "Finance",
  },
  {
    value: "executive",
    label: "Executive",
  },
];

function formatRole(role) {
  if (!role) {
    return "Unknown";
  }

  return (
    role.charAt(0).toUpperCase() +
    role.slice(1)
  );
}

export default function Documents() {
  const navigate = useNavigate();

  // =====================================================
  // USER + DOCUMENT STATE
  // =====================================================

  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);

  // =====================================================
  // UPLOAD FORM STATE
  // =====================================================

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [allowedRoles, setAllowedRoles] = useState([]);
  const [file, setFile] = useState(null);

  // =====================================================
  // GENERAL STATE
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // EDIT STATE
  // =====================================================

  const [editingDocument, setEditingDocument] =
    useState(null);

  const [editTitle, setEditTitle] = useState("");
  const [editDepartment, setEditDepartment] =
    useState("");

  const [editAllowedRoles, setEditAllowedRoles] =
    useState([]);

  const [savingEdit, setSavingEdit] = useState(false);

  // =====================================================
  // REPLACE / DELETE STATE
  // =====================================================

  const [replacingDocumentId, setReplacingDocumentId] =
    useState(null);

  const [deletingDocumentId, setDeletingDocumentId] =
    useState(null);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadPage();
  }, []);

  // =====================================================
  // LOAD PAGE
  // =====================================================

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const currentUser = await getCurrentUser();

      setUser(currentUser);

      if (
        !MANAGEMENT_ROLES.includes(
          currentUser.role,
        )
      ) {
        setError(
          "You do not have permission to manage documents.",
        );

        return;
      }

      await loadDocumentsOnly();
    } catch (err) {
      if (err.status === 401) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      setError(
        err.message ||
          "Failed to load document management page.",
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // LOAD DOCUMENTS
  // =====================================================

  async function loadDocumentsOnly() {
    try {
      const response = await getDocuments();

      let documentList = [];

      if (Array.isArray(response)) {
        documentList = response;
      } else if (
        Array.isArray(response?.documents)
      ) {
        documentList = response.documents;
      } else if (
        Array.isArray(response?.items)
      ) {
        documentList = response.items;
      } else if (
        Array.isArray(response?.data)
      ) {
        documentList = response.data;
      }

      setDocuments(documentList);
    } catch (err) {
      if (err.status === 401) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      setError(
        err.message ||
          "Failed to refresh documents.",
      );
    }
  }

  // =====================================================
  // ROLE HELPERS
  // =====================================================

  function handleRoleChange(role) {
    setAllowedRoles((currentRoles) => {
      if (currentRoles.includes(role)) {
        return currentRoles.filter(
          (currentRole) =>
            currentRole !== role,
        );
      }

      return [...currentRoles, role];
    });
  }

  function handleEditRoleChange(role) {
    setEditAllowedRoles((currentRoles) => {
      if (currentRoles.includes(role)) {
        return currentRoles.filter(
          (currentRole) =>
            currentRole !== role,
        );
      }

      return [...currentRoles, role];
    });
  }

  // =====================================================
  // FILE CHANGE
  // =====================================================

  function handleFileChange(event) {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      selectedFile.type !==
      "application/pdf"
    ) {
      setFile(null);
      setError("Only PDF files are allowed.");
      event.target.value = "";
      return;
    }

    setError("");
    setFile(selectedFile);
  }

  // =====================================================
  // UPLOAD DOCUMENT
  // =====================================================

  async function handleUpload(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError(
        "Please enter a document title.",
      );
      return;
    }

    if (!department.trim()) {
      setError(
        "Please enter a department.",
      );
      return;
    }

    if (allowedRoles.length === 0) {
      setError(
        "Please select at least one allowed role.",
      );
      return;
    }

    if (!file) {
      setError(
        "Please select a PDF file.",
      );
      return;
    }

    setUploading(true);

    try {
      const response = await uploadDocument({
        title: title.trim(),
        department: department.trim(),
        allowedRoles,
        file,
      });

      setSuccess(
        `Document uploaded successfully. Status: ${response.status}`,
      );

      setTitle("");
      setDepartment("");
      setAllowedRoles([]);
      setFile(null);

      const fileInput =
        document.getElementById(
          "document-file",
        );

      if (fileInput) {
        fileInput.value = "";
      }

      await loadDocumentsOnly();
    } catch (err) {
      if (err.status === 401) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      setError(
        err.message ||
          "Document upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  // =====================================================
  // START EDIT
  // =====================================================

  function startEdit(documentItem) {
    setEditingDocument(documentItem);

    setEditTitle(
      documentItem.title || "",
    );

    setEditDepartment(
      documentItem.department || "",
    );

    setEditAllowedRoles(
      Array.isArray(
        documentItem.allowed_roles,
      )
        ? documentItem.allowed_roles
        : [],
    );

    setError("");
    setSuccess("");
  }

  // =====================================================
  // CANCEL EDIT
  // =====================================================

  function cancelEdit() {
    setEditingDocument(null);
    setEditTitle("");
    setEditDepartment("");
    setEditAllowedRoles([]);
  }

  // =====================================================
  // UPDATE DOCUMENT
  // =====================================================

  async function handleUpdateDocument(event) {
    event.preventDefault();

    if (!editingDocument) {
      return;
    }

    setError("");
    setSuccess("");

    if (!editTitle.trim()) {
      setError(
        "Please enter a document title.",
      );
      return;
    }

    if (!editDepartment.trim()) {
      setError(
        "Please enter a department.",
      );
      return;
    }

    if (editAllowedRoles.length === 0) {
      setError(
        "Please select at least one allowed role.",
      );
      return;
    }

    setSavingEdit(true);

    try {
      await updateDocument(
        editingDocument.id,
        {
          title: editTitle.trim(),
          department:
            editDepartment.trim(),
          allowedRoles:
            editAllowedRoles,
        },
      );

      setSuccess(
        "Document details updated successfully.",
      );

      cancelEdit();

      await loadDocumentsOnly();
    } catch (err) {
      if (err.status === 401) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      setError(
        err.message ||
          "Failed to update document.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // =====================================================
  // REPLACE PDF
  // =====================================================

  async function handleReplacePdf(
    documentItem,
    event,
  ) {
    const selectedFile =
      event.target.files?.[0];

    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !==
      "application/pdf"
    ) {
      setError(
        "Only PDF files are allowed.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Replace the PDF for "${documentItem.title}"?\n\nThe new PDF will be processed and indexed again.`,
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    setReplacingDocumentId(
      documentItem.id,
    );

    try {
      const response =
        await replaceDocumentPdf(
          documentItem.id,
          selectedFile,
        );

      setSuccess(
        `PDF replaced successfully. Status: ${response.status}`,
      );

      await loadDocumentsOnly();
    } catch (err) {
      if (err.status === 401) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      setError(
        err.message ||
          "Failed to replace PDF.",
      );
    } finally {
      setReplacingDocumentId(null);
    }
  }

  // =====================================================
  // DELETE DOCUMENT
  // =====================================================

  async function handleDeleteDocument(
    documentItem,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${documentItem.title}"?\n\nThis will remove the document and its indexed RAG data.\n\nThis action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    setDeletingDocumentId(
      documentItem.id,
    );

    try {
      await deleteDocument(
        documentItem.id,
      );

      setSuccess(
        "Document deleted successfully.",
      );

      if (
        editingDocument?.id ===
        documentItem.id
      ) {
        cancelEdit();
      }

      await loadDocumentsOnly();
    } catch (err) {
      if (err.status === 401) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      setError(
        err.message ||
          "Failed to delete document.",
      );
    } finally {
      setDeletingDocumentId(null);
    }
  }

  // =====================================================
  // ACTION LOCK
  // =====================================================

  function isDocumentBusy(documentId) {
    return (
      replacingDocumentId === documentId ||
      deletingDocumentId === documentId
    );
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <AppLayout>
        <main className="documents-page">
          <div className="documents-loading">
            <div className="documents-spinner" />

            <p>
              Loading document management...
            </p>
          </div>
        </main>
      </AppLayout>
    );
  }

  // =====================================================
  // ACCESS DENIED
  // =====================================================

  if (
    !user ||
    !MANAGEMENT_ROLES.includes(
      user.role,
    )
  ) {
    return (
      <AppLayout>
        <main className="documents-page">
          <section className="documents-access-card">
            <div className="documents-access-icon">
              !
            </div>

            <p className="documents-eyebrow">
              ACCESS RESTRICTED
            </p>

            <h1>
              Document Management
            </h1>

            <p>
              {error ||
                "Only Executive and Admin users can manage documents."}
            </p>

            <button
              type="button"
              className="documents-primary-button"
              onClick={() =>
                navigate("/chat")
              }
            >
              ← Back to Chat
            </button>
          </section>
        </main>
      </AppLayout>
    );
  }

  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <AppLayout>
      <main className="documents-page">

        {/* PAGE HEADER */}
        <header className="documents-header">
          <div>
            <p className="documents-eyebrow">
              KNOWLEDGE BASE
            </p>

            <h1>
              Document Management
            </h1>

            <p className="documents-subtitle">
              Upload and manage company
              documents for the secure
              RAG knowledge base.
            </p>
          </div>

          <div className="documents-header-status">
            <span className="documents-status-dot" />

            <div>
              <strong>
                {formatRole(user.role)} access
              </strong>

              <span>
                Document management enabled
              </span>
            </div>
          </div>
        </header>

        {/* MESSAGES */}

        {error && (
          <div className="documents-message documents-error">
            <span>!</span>

            <div>
              <strong>
                Something went wrong
              </strong>

              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="documents-message documents-success">
            <span>✓</span>

            <div>
              <strong>
                Operation completed
              </strong>

              <p>{success}</p>
            </div>
          </div>
        )}

        {/* UPLOAD CARD */}

        <section className="documents-card">
          <div className="documents-card-header">
            <div>
              <p className="documents-section-label">
                NEW DOCUMENT
              </p>

              <h2>
                Add Document
              </h2>

              <p>
                Upload a PDF and define which
                roles can retrieve information
                from it.
              </p>
            </div>

            <div className="documents-card-icon">
              +
            </div>
          </div>

          <form
            className="documents-form"
            onSubmit={handleUpload}
          >
            <div className="documents-form-grid">

              {/* TITLE */}

              <div className="documents-form-group">
                <label htmlFor="document-title">
                  Document Title
                </label>

                <input
                  id="document-title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value,
                    )
                  }
                  placeholder="Employee Leave Policy"
                  maxLength={200}
                />
              </div>

              {/* DEPARTMENT */}

              <div className="documents-form-group">
                <label htmlFor="document-department">
                  Department
                </label>

                <input
                  id="document-department"
                  type="text"
                  value={department}
                  onChange={(event) =>
                    setDepartment(
                      event.target.value,
                    )
                  }
                  placeholder="HR"
                  maxLength={100}
                />
              </div>
            </div>

            {/* ROLES */}

            <div className="documents-form-group">
              <label>
                Allowed Roles
              </label>

              <p className="documents-help">
                Only selected roles will be
                allowed to retrieve content
                from this document.
              </p>

              <div className="documents-role-options">
                {AVAILABLE_ROLES.map(
                  (role) => (
                    <label
                      key={role.value}
                      className={
                        allowedRoles.includes(
                          role.value,
                        )
                          ? "documents-role-option selected"
                          : "documents-role-option"
                      }
                    >
                      <input
                        type="checkbox"
                        checked={allowedRoles.includes(
                          role.value,
                        )}
                        onChange={() =>
                          handleRoleChange(
                            role.value,
                          )
                        }
                      />

                      <span>
                        {role.label}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </div>

            {/* PDF */}

            <div className="documents-form-group">
              <label htmlFor="document-file">
                PDF Document
              </label>

              <label
                htmlFor="document-file"
                className={
                  file
                    ? "documents-file-drop selected"
                    : "documents-file-drop"
                }
              >
                <span className="documents-file-icon">
                  ↑
                </span>

                <span>
                  <strong>
                    {file
                      ? file.name
                      : "Choose a PDF file"}
                  </strong>

                  <small>
                    {file
                      ? "PDF selected and ready to upload"
                      : "PDF files only"}
                  </small>
                </span>
              </label>

              <input
                id="document-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="documents-hidden-file"
              />
            </div>

            {/* UPLOAD */}

            <div className="documents-form-actions">
              <button
                type="submit"
                className="documents-primary-button"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <span className="documents-button-spinner" />
                    Uploading & indexing...
                  </>
                ) : (
                  "↑ Upload Document"
                )}
              </button>
            </div>
          </form>
        </section>

        {/* DOCUMENT LIST */}

        <section className="documents-card">
          <div className="documents-card-header">
            <div>
              <p className="documents-section-label">
                KNOWLEDGE BASE
              </p>

              <h2>
                Uploaded Documents
              </h2>

              <p>
                Documents currently registered
                in the system.
              </p>
            </div>

            <button
              type="button"
              className="documents-refresh-button"
              onClick={loadDocumentsOnly}
              disabled={
                uploading ||
                savingEdit ||
                replacingDocumentId !== null ||
                deletingDocumentId !== null
              }
            >
              ↻ Refresh
            </button>
          </div>

          <div className="documents-count">
            <strong>
              {documents.length}
            </strong>

            <span>
              document
              {documents.length !== 1
                ? "s"
                : ""}{" "}
              registered
            </span>
          </div>

          {/* EMPTY */}

          {documents.length === 0 ? (
            <div className="documents-empty">
              <div className="documents-empty-icon">
                📄
              </div>

              <h3>
                No documents yet
              </h3>

              <p>
                Upload your first PDF to
                create a searchable knowledge
                source.
              </p>
            </div>
          ) : (
            <div className="documents-table-wrapper">
              <table className="documents-table">

                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Department</th>
                    <th>Access</th>
                    <th>Status</th>
                    <th>Pages</th>
                    <th>Chunks</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {documents.map(
                    (documentItem) => {
                      const status =
                        String(
                          documentItem.status ||
                            "",
                        ).toLowerCase();

                      const busy =
                        isDocumentBusy(
                          documentItem.id,
                        );

                      return (
                        <tr
                          key={
                            documentItem.id
                          }
                        >

                          {/* DOCUMENT */}

                          <td>
                            <div className="documents-name-cell">
                              <div className="documents-file-avatar">
                                PDF
                              </div>

                              <div>
                                <strong>
                                  {documentItem.title ||
                                    "Untitled document"}
                                </strong>

                                <span>
                                  {documentItem.original_file_name ||
                                    "No filename"}
                                </span>

                                {documentItem.file_size && (
                                  <small>
                                    {(
                                      documentItem.file_size /
                                      1024
                                    ).toFixed(
                                      1,
                                    )}{" "}
                                    KB
                                  </small>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* DEPARTMENT */}

                          <td>
                            <span className="documents-department">
                              {documentItem.department ||
                                "-"}
                            </span>
                          </td>

                          {/* ACCESS */}

                          <td>
                            <div className="documents-role-list">
                              {Array.isArray(
                                documentItem.allowed_roles,
                              ) &&
                              documentItem.allowed_roles
                                .length > 0 ? (
                                documentItem.allowed_roles.map(
                                  (role) => (
                                    <span
                                      key={role}
                                      className="documents-role-badge"
                                    >
                                      {formatRole(
                                        role,
                                      )}
                                    </span>
                                  ),
                                )
                              ) : (
                                <span className="documents-muted">
                                  -
                                </span>
                              )}
                            </div>
                          </td>

                          {/* STATUS */}

                          <td>
                            <span
                              className={
                                status === "ready"
                                  ? "documents-status ready"
                                  : status === "failed"
                                    ? "documents-status failed"
                                    : "documents-status processing"
                              }
                            >
                              <span />

                              {formatRole(
                                status ||
                                  "unknown",
                              )}
                            </span>
                          </td>

                          {/* PAGES */}

                          <td>
                            <span className="documents-number">
                              {documentItem.page_count ??
                                "-"}
                            </span>
                          </td>

                          {/* CHUNKS */}

                          <td>
                            <span className="documents-number">
                              {documentItem.chunks_indexed ??
                                "-"}
                            </span>
                          </td>

                          {/* ACTIONS */}

                          <td>
                            <div className="documents-actions">

                              {/* EDIT */}

                              <button
                                type="button"
                                className="documents-action-button edit"
                                onClick={() =>
                                  startEdit(
                                    documentItem,
                                  )
                                }
                                disabled={
                                  busy ||
                                  uploading ||
                                  savingEdit
                                }
                              >
                                Edit
                              </button>

                              {/* REPLACE */}

                              <label
                                className={
                                  busy &&
                                  replacingDocumentId ===
                                    documentItem.id
                                    ? "documents-action-button replace disabled"
                                    : "documents-action-button replace"
                                }
                              >
                                {replacingDocumentId ===
                                documentItem.id
                                  ? "Replacing..."
                                  : "Replace PDF"}

                                <input
                                  type="file"
                                  accept=".pdf,application/pdf"
                                  disabled={
                                    busy ||
                                    uploading ||
                                    savingEdit
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    handleReplacePdf(
                                      documentItem,
                                      event,
                                    )
                                  }
                                />
                              </label>

                              {/* DELETE */}

                              <button
                                type="button"
                                className="documents-action-button delete"
                                disabled={
                                  busy ||
                                  uploading ||
                                  savingEdit
                                }
                                onClick={() =>
                                  handleDeleteDocument(
                                    documentItem,
                                  )
                                }
                              >
                                {deletingDocumentId ===
                                documentItem.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECURITY INFORMATION */}

        <section className="documents-security-info">
          <div className="documents-security-icon">
            ✓
          </div>

          <div>
            <strong>
              Role-based document protection
            </strong>

            <p>
              Access permissions are enforced
              by the backend before document
              content is retrieved for the RAG
              pipeline. Gemini only receives
              document context that the
              authenticated user's role is
              authorized to access.
            </p>
          </div>
        </section>
      </main>

      {/* EDIT MODAL */}

      {editingDocument && (
        <div className="documents-modal-overlay">

          <div className="documents-modal">

            <div className="documents-modal-header">
              <div>
                <p className="documents-section-label">
                  DOCUMENT SETTINGS
                </p>

                <h2>
                  Edit Document
                </h2>

                <p>
                  Update metadata and access
                  permissions.
                </p>
              </div>

              <button
                type="button"
                className="documents-modal-close"
                onClick={cancelEdit}
                disabled={savingEdit}
              >
                ×
              </button>
            </div>

            <form
              className="documents-form"
              onSubmit={
                handleUpdateDocument
              }
            >

              {/* EDIT TITLE */}

              <div className="documents-form-group">
                <label htmlFor="edit-document-title">
                  Document Title
                </label>

                <input
                  id="edit-document-title"
                  type="text"
                  value={editTitle}
                  onChange={(event) =>
                    setEditTitle(
                      event.target.value,
                    )
                  }
                  maxLength={200}
                />
              </div>

              {/* EDIT DEPARTMENT */}

              <div className="documents-form-group">
                <label htmlFor="edit-document-department">
                  Department
                </label>

                <input
                  id="edit-document-department"
                  type="text"
                  value={editDepartment}
                  onChange={(event) =>
                    setEditDepartment(
                      event.target.value,
                    )
                  }
                  maxLength={100}
                />
              </div>

              {/* EDIT ROLES */}

              <div className="documents-form-group">
                <label>
                  Allowed Roles
                </label>

                <p className="documents-help">
                  Select which roles can retrieve
                  information from this document.
                </p>

                <div className="documents-role-options">
                  {AVAILABLE_ROLES.map(
                    (role) => (
                      <label
                        key={role.value}
                        className={
                          editAllowedRoles.includes(
                            role.value,
                          )
                            ? "documents-role-option selected"
                            : "documents-role-option"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={editAllowedRoles.includes(
                            role.value,
                          )}
                          onChange={() =>
                            handleEditRoleChange(
                              role.value,
                            )
                          }
                        />

                        <span>
                          {role.label}
                        </span>
                      </label>
                    ),
                  )}
                </div>
              </div>

              {/* MODAL ACTIONS */}

              <div className="documents-modal-actions">
                <button
                  type="button"
                  className="documents-secondary-button"
                  onClick={cancelEdit}
                  disabled={savingEdit}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="documents-primary-button"
                  disabled={savingEdit}
                >
                  {savingEdit
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}