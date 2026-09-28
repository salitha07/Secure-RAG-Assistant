const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000";

const TOKEN_KEY = "secure_rag_access_token";


// ============================================================
// API ERROR
// ============================================================

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}


// ============================================================
// AUTH HELPERS
// ============================================================

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

export function logoutUser() {
  sessionStorage.removeItem(TOKEN_KEY);
}


// ============================================================
// ERROR MESSAGE
// ============================================================

function getErrorMessage(data, status) {
  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((error) => error.msg)
      .join(", ");
  }

  return `Request failed with status ${status}.`;
}


// ============================================================
// NORMAL JSON API REQUEST
// ============================================================

async function apiRequest(
  path,
  {
    method = "GET",
    body,
    requiresAuth = false,
  } = {},
) {
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (requiresAuth) {
    const token = getAccessToken();

    if (!token) {
      throw new ApiError(
        "Please log in to continue.",
        401,
      );
    }

    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Could not connect to the backend server.",
    );
  }

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    if (
      response.status === 401 &&
      requiresAuth
    ) {
      logoutUser();
    }

    throw new ApiError(
      getErrorMessage(data, response.status),
      response.status,
      data,
    );
  }

  return data;
}


// ============================================================
// FORM DATA API REQUEST
// Used for PDF upload / PDF replacement
// ============================================================

async function apiFormRequest(
  path,
  {
    method = "POST",
    formData,
    requiresAuth = false,
  } = {},
) {
  const headers = {
    Accept: "application/json",
  };

  if (requiresAuth) {
    const token = getAccessToken();

    if (!token) {
      throw new ApiError(
        "Please log in to continue.",
        401,
      );
    }

    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Could not connect to the backend server.",
    );
  }

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    if (
      response.status === 401 &&
      requiresAuth
    ) {
      logoutUser();
    }

    throw new ApiError(
      getErrorMessage(data, response.status),
      response.status,
      data,
    );
  }

  return data;
}


// ============================================================
// AUTH
// ============================================================

export function registerUser(userDetails) {
  return apiRequest(
    "/api/v1/auth/register",
    {
      method: "POST",
      body: userDetails,
    },
  );
}


export async function loginUser(credentials) {
  const response = await apiRequest(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: credentials,
    },
  );

  sessionStorage.setItem(
    TOKEN_KEY,
    response.access_token,
  );

  return response;
}


export function getCurrentUser() {
  return apiRequest(
    "/api/v1/auth/me",
    {
      requiresAuth: true,
    },
  );
}


// ============================================================
// CHAT
// ============================================================

export function askQuestion(
  question,
  conversationId = null,
) {
  const body = {
    question,
  };

  if (conversationId) {
    body.conversation_id = conversationId;
  }

  return apiRequest(
    "/api/v1/ask",
    {
      method: "POST",
      body,
      requiresAuth: true,
    },
  );
}


// ============================================================
// CONVERSATIONS
// ============================================================

export function getConversations({
  limit = 50,
  offset = 0,
} = {}) {
  const parameters = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest(
    `/api/v1/conversations?${parameters.toString()}`,
    {
      requiresAuth: true,
    },
  );
}


export function getConversation(
  conversationId,
) {
  return apiRequest(
    `/api/v1/conversations/${encodeURIComponent(
      conversationId,
    )}`,
    {
      requiresAuth: true,
    },
  );
}


export function deleteConversation(
  conversationId,
) {
  return apiRequest(
    `/api/v1/conversations/${encodeURIComponent(
      conversationId,
    )}`,
    {
      method: "DELETE",
      requiresAuth: true,
    },
  );
}


// ============================================================
// AUDIT LOGS
// ============================================================

export function getAuditLogs({
  limit = 10,
  offset = 0,
} = {}) {
  const parameters = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest(
    `/api/v1/audit-logs?${parameters.toString()}`,
    {
      requiresAuth: true,
    },
  );
}


// ============================================================
// DOCUMENTS - LIST
// ============================================================

export function getDocuments({
  limit = 50,
  offset = 0,
} = {}) {
  const parameters = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest(
    `/api/v1/documents?${parameters.toString()}`,
    {
      requiresAuth: true,
    },
  );
}


// ============================================================
// DOCUMENTS - CREATE / UPLOAD
// ============================================================

export function uploadDocument({
  title,
  department,
  allowedRoles,
  file,
}) {
  const formData = new FormData();

  formData.append(
    "title",
    title,
  );

  formData.append(
    "department",
    department,
  );

  // FastAPI receives repeated allowed_roles fields
  // as an array.
  allowedRoles.forEach((role) => {
    formData.append(
      "allowed_roles",
      role,
    );
  });

  formData.append(
    "file",
    file,
  );

  return apiFormRequest(
    "/api/v1/documents",
    {
      method: "POST",
      formData,
      requiresAuth: true,
    },
  );
}


// ============================================================
// DOCUMENTS - UPDATE METADATA
// ============================================================

export function updateDocument(
  documentId,
  {
    title,
    department,
    allowedRoles,
  },
) {
  return apiRequest(
    `/api/v1/documents/${encodeURIComponent(
      documentId,
    )}`,
    {
      method: "PATCH",
      body: {
        title,
        department,
        allowed_roles: allowedRoles,
      },
      requiresAuth: true,
    },
  );
}


// ============================================================
// DOCUMENTS - REPLACE PDF
// ============================================================

export function replaceDocumentPdf(
  documentId,
  file,
) {
  const formData = new FormData();

  formData.append(
    "file",
    file,
  );

  return apiFormRequest(
    `/api/v1/documents/${encodeURIComponent(
      documentId,
    )}/file`,
    {
      method: "PUT",
      formData,
      requiresAuth: true,
    },
  );
}


// ============================================================
// DOCUMENTS - DELETE
// ============================================================

export function deleteDocument(
  documentId,
) {
  return apiRequest(
    `/api/v1/documents/${encodeURIComponent(
      documentId,
    )}`,
    {
      method: "DELETE",
      requiresAuth: true,
    },
  );
}