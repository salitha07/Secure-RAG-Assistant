import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getCurrentUser,
  getDocuments,
  uploadDocument,
  updateDocument,
  replaceDocumentPdf,
  deleteDocument,
  logoutUser,
} from "../services/api";

const MANAGEMENT_ROLES = ["executive", "admin"];

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

export default function Documents() {
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

      console.log("Current user:", currentUser);

      setUser(currentUser);

      if (!MANAGEMENT_ROLES.includes(currentUser.role)) {
        setError(
          "You do not have permission to manage documents.",
        );

        return;
      }

      await loadDocumentsOnly();
    } catch (err) {
      console.error(
        "Failed to load document page:",
        err,
      );

      setError(
        err.message ||
          "Failed to load document management page.",
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // LOAD DOCUMENTS ONLY
  // =====================================================

  async function loadDocumentsOnly() {
    try {
      console.log(
        "Refreshing document list...",
      );

      const response = await getDocuments();

      console.log(
        "Documents API response:",
        response,
      );

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

      console.log(
        "Documents extracted:",
        documentList,
      );

      setDocuments(documentList);
    } catch (err) {
      console.error(
        "Failed to refresh documents:",
        err,
      );

      setError(
        err.message ||
          "Failed to refresh documents.",
      );
    }
  }

  // =====================================================
  // UPLOAD - ROLE CHANGE
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

      setError(
        "Only PDF files are allowed.",
      );

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
      console.log(
        "Uploading document...",
      );

      const response =
        await uploadDocument({
          title: title.trim(),
          department: department.trim(),
          allowedRoles,
          file,
        });

      console.log(
        "Upload response:",
        response,
      );

      setSuccess(
        `Document uploaded successfully. Status: ${response.status}`,
      );

      // Clear form
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

      // Refresh list
      await loadDocumentsOnly();
    } catch (err) {
      console.error(
        "Document upload failed:",
        err,
      );

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
    setEditingDocument(
      documentItem,
    );

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
  // EDIT ROLE CHANGE
  // =====================================================

  function handleEditRoleChange(role) {
    setEditAllowedRoles(
      (currentRoles) => {
        if (
          currentRoles.includes(role)
        ) {
          return currentRoles.filter(
            (currentRole) =>
              currentRole !== role,
          );
        }

        return [
          ...currentRoles,
          role,
        ];
      },
    );
  }

  // =====================================================
  // UPDATE DOCUMENT
  // =====================================================

  async function handleUpdateDocument(
    event,
  ) {
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

    if (
      editAllowedRoles.length ===
      0
    ) {
      setError(
        "Please select at least one allowed role.",
      );
      return;
    }

    setSavingEdit(true);

    try {
      console.log(
        "Updating document:",
        editingDocument.id,
      );

      const response =
        await updateDocument(
          editingDocument.id,
          {
            title:
              editTitle.trim(),
            department:
              editDepartment.trim(),
            allowedRoles:
              editAllowedRoles,
          },
        );

      console.log(
        "Update response:",
        response,
      );

      setSuccess(
        "Document details updated successfully.",
      );

      cancelEdit();

      await loadDocumentsOnly();
    } catch (err) {
      console.error(
        "Document update failed:",
        err,
      );

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

    // Allow selecting the same file again
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
      console.log(
        "Replacing PDF:",
        documentItem.id,
      );

      const response =
        await replaceDocumentPdf(
          documentItem.id,
          selectedFile,
        );

      console.log(
        "Replace response:",
        response,
      );

      setSuccess(
        `PDF replaced successfully. Status: ${response.status}`,
      );

      await loadDocumentsOnly();
    } catch (err) {
      console.error(
        "PDF replacement failed:",
        err,
      );

      setError(
        err.message ||
          "Failed to replace PDF.",
      );
    } finally {
      setReplacingDocumentId(
        null,
      );
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
      console.log(
        "Deleting document:",
        documentItem.id,
      );

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
      console.error(
        "Document deletion failed:",
        err,
      );

      setError(
        err.message ||
          "Failed to delete document.",
      );
    } finally {
      setDeletingDocumentId(null);
    }
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  function handleLogout() {
    logoutUser();
    window.location.href = "/login";
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p>
            Loading document management...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // USER ERROR
  // =====================================================

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2>
            Document Management
          </h2>

          <p>
            {error ||
              "Unable to load your account."}
          </p>

          <Link
            to="/chat"
            style={styles.linkButton}
          >
            Back to Chat
          </Link>
        </div>
      </div>
    );
  }

  // =====================================================
  // PERMISSION CHECK
  // =====================================================

  if (
    !MANAGEMENT_ROLES.includes(
      user.role,
    )
  ) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2>
            Access Denied
          </h2>

          <p>
            Only Executive and Admin
            users can manage
            documents.
          </p>

          <Link
            to="/chat"
            style={styles.linkButton}
          >
            Back to Chat
          </Link>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* =================================================
            HEADER
        ================================================= */}

        <div style={styles.header}>
          <div>
            <h1 style={styles.heading}>
              Document Management
            </h1>

            <p style={styles.subtitle}>
              Upload and manage company
              documents for the RAG
              knowledge base.
            </p>

            <p style={styles.userInfo}>
              Logged in as{" "}
              <strong>
                {user.full_name ||
                  user.email}
              </strong>{" "}
              ({user.role})
            </p>
          </div>

          <div
            style={
              styles.headerButtons
            }
          >
            <Link
              to="/chat"
              style={
                styles.secondaryButton
              }
            >
              Back to Chat
            </Link>

            <button
              type="button"
              onClick={
                handleLogout
              }
              style={
                styles.logoutButton
              }
            >
              Log out
            </button>
          </div>
        </div>

        {/* =================================================
            MESSAGES
        ================================================= */}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {success && (
          <div
            style={
              styles.success
            }
          >
            {success}
          </div>
        )}

        {/* =================================================
            UPLOAD CARD
        ================================================= */}

        <div style={styles.card}>
          <h2
            style={
              styles.cardTitle
            }
          >
            Add New Document
          </h2>

          <form
            onSubmit={
              handleUpload
            }
          >

            {/* TITLE */}

            <div
              style={
                styles.formGroup
              }
            >
              <label
                style={
                  styles.label
                }
              >
                Document Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(
                  event,
                ) =>
                  setTitle(
                    event.target
                      .value,
                  )
                }
                placeholder="Example: Employee Leave Policy"
                maxLength={200}
                style={
                  styles.input
                }
              />
            </div>

            {/* DEPARTMENT */}

            <div
              style={
                styles.formGroup
              }
            >
              <label
                style={
                  styles.label
                }
              >
                Department
              </label>

              <input
                type="text"
                value={
                  department
                }
                onChange={(
                  event,
                ) =>
                  setDepartment(
                    event.target
                      .value,
                  )
                }
                placeholder="Example: HR"
                maxLength={100}
                style={
                  styles.input
                }
              />
            </div>

            {/* ROLES */}

            <div
              style={
                styles.formGroup
              }
            >
              <label
                style={
                  styles.label
                }
              >
                Allowed Roles
              </label>

              <p
                style={
                  styles.helpText
                }
              >
                Select which roles
                are allowed to
                retrieve
                information from
                this document.
              </p>

              <div
                style={
                  styles.rolesContainer
                }
              >
                {AVAILABLE_ROLES.map(
                  (role) => (
                    <label
                      key={
                        role.value
                      }
                      style={
                        styles.checkboxLabel
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
                        {
                          role.label
                        }
                      </span>
                    </label>
                  ),
                )}
              </div>
            </div>

            {/* PDF */}

            <div
              style={
                styles.formGroup
              }
            >
              <label
                style={
                  styles.label
                }
              >
                PDF Document
              </label>

              <input
                id="document-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={
                  handleFileChange
                }
                style={
                  styles.fileInput
                }
              />

              {file && (
                <p
                  style={
                    styles.fileInfo
                  }
                >
                  Selected:{" "}
                  <strong>
                    {file.name}
                  </strong>
                </p>
              )}
            </div>

            {/* UPLOAD BUTTON */}

            <button
              type="submit"
              disabled={uploading}
              style={{
                ...styles.uploadButton,
                opacity:
                  uploading
                    ? 0.7
                    : 1,
              }}
            >
              {uploading
                ? "Uploading and indexing..."
                : "Upload Document"}
            </button>
          </form>
        </div>

        {/* =================================================
            DOCUMENT LIST
        ================================================= */}

        <div style={styles.card}>
          <div
            style={
              styles.documentsHeader
            }
          >
            <div>
              <h2
                style={
                  styles.cardTitle
                }
              >
                Uploaded Documents
              </h2>

              <p
                style={
                  styles.helpText
                }
              >
                Documents currently
                registered in the
                system.
              </p>
            </div>

            <button
              type="button"
              onClick={
                loadDocumentsOnly
              }
              style={
                styles.refreshButton
              }
            >
              🔄 Refresh
            </button>
          </div>

          {/* COUNT */}

          <div
            style={
              styles.documentCount
            }
          >
            {documents.length}{" "}
            document
            {documents.length !==
            1
              ? "s"
              : ""}{" "}
            registered
          </div>

          {/* EMPTY */}

          {documents.length ===
          0 ? (
            <div
              style={
                styles.empty
              }
            >
              No documents have
              been uploaded yet.
            </div>
          ) : (
            <div
              style={
                styles.tableWrapper
              }
            >
              <table
                style={
                  styles.table
                }
              >

                {/* TABLE HEADER */}

                <thead>
                  <tr>
                    <th
                      style={
                        styles.th
                      }
                    >
                      Title
                    </th>

                    <th
                      style={
                        styles.th
                      }
                    >
                      Department
                    </th>

                    <th
                      style={
                        styles.th
                      }
                    >
                      File
                    </th>

                    <th
                      style={
                        styles.th
                      }
                    >
                      Roles
                    </th>

                    <th
                      style={
                        styles.th
                      }
                    >
                      Status
                    </th>

                    <th
                      style={
                        styles.th
                      }
                    >
                      Pages
                    </th>

                    <th
                      style={
                        styles.th
                      }
                    >
                      Chunks
                    </th>

                    <th
                      style={
                        styles.th
                      }
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                {/* TABLE BODY */}

                <tbody>
                  {documents.map(
                    (documentItem) => {
                      const status =
                        String(
                          documentItem.status ||
                            "",
                        ).toLowerCase();

                      return (
                        <tr
                          key={
                            documentItem.id
                          }
                        >

                          {/* TITLE */}

                          <td
                            style={
                              styles.td
                            }
                          >
                            <strong>
                              {documentItem.title ||
                                "Untitled document"}
                            </strong>
                          </td>

                          {/* DEPARTMENT */}

                          <td
                            style={
                              styles.td
                            }
                          >
                            {documentItem.department ||
                              "-"}
                          </td>

                          {/* FILE */}

                          <td
                            style={
                              styles.td
                            }
                          >
                            <div>
                              {documentItem.original_file_name ||
                                "-"}
                            </div>

                            {documentItem.file_size && (
                              <small
                                style={
                                  styles.fileSize
                                }
                              >
                                {(
                                  documentItem.file_size /
                                  1024
                                ).toFixed(
                                  1,
                                )}{" "}
                                KB
                              </small>
                            )}
                          </td>

                          {/* ROLES */}

                          <td
                            style={
                              styles.td
                            }
                          >
                            <div
                              style={
                                styles.roleList
                              }
                            >
                              {Array.isArray(
                                documentItem.allowed_roles,
                              ) &&
                              documentItem
                                .allowed_roles
                                .length >
                                0 ? (
                                documentItem.allowed_roles.map(
                                  (
                                    role,
                                  ) => (
                                    <span
                                      key={
                                        role
                                      }
                                      style={
                                        styles.roleBadge
                                      }
                                    >
                                      {
                                        role
                                      }
                                    </span>
                                  ),
                                )
                              ) : (
                                <span>
                                  -
                                </span>
                              )}
                            </div>
                          </td>

                          {/* STATUS */}

                          <td
                            style={
                              styles.td
                            }
                          >
                            <span
                              style={{
                                ...styles.statusBadge,

                                ...(status ===
                                "ready"
                                  ? styles.readyStatus
                                  : {}),

                                ...(status ===
                                "failed"
                                  ? styles.failedStatus
                                  : {}),
                              }}
                            >
                              {documentItem.status ||
                                "unknown"}
                            </span>
                          </td>

                          {/* PAGES */}

                          <td
                            style={
                              styles.td
                            }
                          >
                            {documentItem.page_count ??
                              "-"}
                          </td>

                          {/* CHUNKS */}

                          <td
                            style={
                              styles.td
                            }
                          >
                            {documentItem.chunks_indexed ??
                              "-"}
                          </td>

                          {/* ACTIONS */}

                          <td
                            style={
                              styles.td
                            }
                          >
                            <div
                              style={
                                styles.actionsContainer
                              }
                            >

                              {/* EDIT */}

                              <button
                                type="button"
                                onClick={() =>
                                  startEdit(
                                    documentItem,
                                  )
                                }
                                style={
                                  styles.editButton
                                }
                              >
                                ✏️ Edit
                              </button>

                              {/* REPLACE PDF */}

                              <label
                                style={{
                                  ...styles.replaceButton,

                                  opacity:
                                    replacingDocumentId ===
                                    documentItem.id
                                      ? 0.6
                                      : 1,
                                }}
                              >
                                📄{" "}
                                {replacingDocumentId ===
                                documentItem.id
                                  ? "Replacing..."
                                  : "Replace PDF"}

                                <input
                                  type="file"
                                  accept=".pdf,application/pdf"
                                  disabled={
                                    replacingDocumentId ===
                                    documentItem.id
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    handleReplacePdf(
                                      documentItem,
                                      event,
                                    )
                                  }
                                  style={{
                                    display:
                                      "none",
                                  }}
                                />
                              </label>

                              {/* DELETE */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteDocument(
                                    documentItem,
                                  )
                                }
                                disabled={
                                  deletingDocumentId ===
                                  documentItem.id
                                }
                                style={{
                                  ...styles.deleteButton,

                                  opacity:
                                    deletingDocumentId ===
                                    documentItem.id
                                      ? 0.6
                                      : 1,
                                }}
                              >
                                🗑️{" "}
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
        </div>
      </div>

      {/* =================================================
          EDIT MODAL
      ================================================= */}

      {editingDocument && (
        <div
          style={
            styles.modalOverlay
          }
        >
          <div
            style={
              styles.modal
            }
          >

            <div
              style={
                styles.modalHeader
              }
            >
              <div>
                <h2
                  style={
                    styles.modalTitle
                  }
                >
                  Edit Document
                </h2>

                <p
                  style={
                    styles.helpText
                  }
                >
                  Update document
                  metadata and
                  access permissions.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cancelEdit
                }
                style={
                  styles.closeButton
                }
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={
                handleUpdateDocument
              }
            >

              {/* EDIT TITLE */}

              <div
                style={
                  styles.formGroup
                }
              >
                <label
                  style={
                    styles.label
                  }
                >
                  Document Title
                </label>

                <input
                  type="text"
                  value={
                    editTitle
                  }
                  onChange={(
                    event,
                  ) =>
                    setEditTitle(
                      event.target
                        .value,
                    )
                  }
                  maxLength={200}
                  style={
                    styles.input
                  }
                />
              </div>

              {/* EDIT DEPARTMENT */}

              <div
                style={
                  styles.formGroup
                }
              >
                <label
                  style={
                    styles.label
                  }
                >
                  Department
                </label>

                <input
                  type="text"
                  value={
                    editDepartment
                  }
                  onChange={(
                    event,
                  ) =>
                    setEditDepartment(
                      event.target
                        .value,
                    )
                  }
                  maxLength={100}
                  style={
                    styles.input
                  }
                />
              </div>

              {/* EDIT ROLES */}

              <div
                style={
                  styles.formGroup
                }
              >
                <label
                  style={
                    styles.label
                  }
                >
                  Allowed Roles
                </label>

                <p
                  style={
                    styles.helpText
                  }
                >
                  Select which roles
                  can retrieve
                  information from
                  this document.
                </p>

                <div
                  style={
                    styles.rolesContainer
                  }
                >
                  {AVAILABLE_ROLES.map(
                    (role) => (
                      <label
                        key={
                          role.value
                        }
                        style={
                          styles.checkboxLabel
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
                          {
                            role.label
                          }
                        </span>
                      </label>
                    ),
                  )}
                </div>
              </div>

              {/* MODAL BUTTONS */}

              <div
                style={
                  styles.modalButtons
                }
              >
                <button
                  type="button"
                  onClick={
                    cancelEdit
                  }
                  disabled={
                    savingEdit
                  }
                  style={
                    styles.cancelButton
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingEdit
                  }
                  style={{
                    ...styles.uploadButton,
                    opacity:
                      savingEdit
                        ? 0.7
                        : 1,
                  }}
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
    </div>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = {
  page: {
    minHeight: "100vh",
    padding: "40px 20px",
    background: "#f5f7fb",
    color: "#1f2937",
  },

  container: {
    maxWidth: "1400px",
    margin: "0 auto",
  },

  card: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "28px",
    marginBottom: "24px",
    boxShadow:
      "0 4px 18px rgba(0, 0, 0, 0.06)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "24px",
  },

  heading: {
    margin: 0,
    fontSize: "30px",
  },

  subtitle: {
    marginTop: "8px",
    color: "#6b7280",
  },

  userInfo: {
    color: "#6b7280",
    fontSize: "14px",
  },

  headerButtons: {
    display: "flex",
    gap: "10px",
  },

  cardTitle: {
    marginTop: 0,
    marginBottom: "18px",
  },

  formGroup: {
    marginBottom: "22px",
  },

  label: {
    display: "block",
    fontWeight: "600",
    marginBottom: "8px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    border:
      "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "15px",
  },

  fileInput: {
    width: "100%",
    padding: "10px",
    border:
      "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
  },

  fileInfo: {
    fontSize: "14px",
    color: "#4b5563",
  },

  fileSize: {
    color: "#6b7280",
    fontSize: "12px",
  },

  helpText: {
    color: "#6b7280",
    fontSize: "14px",
  },

  rolesContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    marginTop: "12px",
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    cursor: "pointer",
  },

  uploadButton: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 22px",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: "600",
    cursor: "pointer",
  },

  secondaryButton: {
    display: "inline-block",
    padding: "10px 16px",
    borderRadius: "8px",
    background: "#e5e7eb",
    color: "#111827",
    textDecoration: "none",
  },

  logoutButton: {
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    background: "#dc2626",
    color: "#ffffff",
    cursor: "pointer",
  },

  refreshButton: {
    border: "none",
    padding: "9px 15px",
    borderRadius: "8px",
    background: "#e5e7eb",
    cursor: "pointer",
    fontWeight: "600",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "14px",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  documentsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "10px",
  },

  documentCount: {
    display: "inline-block",
    marginBottom: "20px",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "13px",
    fontWeight: "600",
  },

  empty: {
    padding: "30px",
    textAlign: "center",
    color: "#6b7280",
    background: "#f9fafb",
    borderRadius: "8px",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },

  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom:
      "2px solid #e5e7eb",
    background: "#f9fafb",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "12px",
    borderBottom:
      "1px solid #e5e7eb",
    verticalAlign: "top",
  },

  roleList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px",
  },

  roleBadge: {
    background: "#eef2ff",
    color: "#3730a3",
    borderRadius: "999px",
    padding: "3px 8px",
    fontSize: "12px",
  },

  statusBadge: {
    display: "inline-block",
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: "999px",
    padding: "4px 9px",
    fontSize: "12px",
    fontWeight: "600",
  },

  readyStatus: {
    background: "#dcfce7",
    color: "#166534",
  },

  failedStatus: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  actionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    minWidth: "125px",
  },

  editButton: {
    border: "none",
    borderRadius: "6px",
    padding: "8px 10px",
    background: "#dbeafe",
    color: "#1d4ed8",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "12px",
  },

  replaceButton: {
    display: "block",
    borderRadius: "6px",
    padding: "8px 10px",
    background: "#ede9fe",
    color: "#6d28d9",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "12px",
    textAlign: "center",
  },

  deleteButton: {
    border: "none",
    borderRadius: "6px",
    padding: "8px 10px",
    background: "#fee2e2",
    color: "#b91c1c",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "12px",
  },

  linkButton: {
    display: "inline-block",
    marginTop: "15px",
    padding: "10px 16px",
    borderRadius: "8px",
    background: "#2563eb",
    color: "#ffffff",
    textDecoration: "none",
  },

  // ===================================================
  // EDIT MODAL
  // ===================================================

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(0, 0, 0, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },

  modal: {
    width: "100%",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: "14px",
    padding: "30px",
    boxShadow:
      "0 20px 50px rgba(0, 0, 0, 0.2)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "25px",
  },

  modalTitle: {
    margin: 0,
    fontSize: "24px",
  },

  closeButton: {
    border: "none",
    background: "#f3f4f6",
    color: "#374151",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "16px",
  },

  modalButtons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "25px",
  },

  cancelButton: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 20px",
    background: "#e5e7eb",
    color: "#111827",
    cursor: "pointer",
    fontWeight: "600",
  },
};