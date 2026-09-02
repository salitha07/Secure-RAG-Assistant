const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://127.0.0.1:8000";

const TOKEN_KEY = "secure_rag_access_token";


export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}


export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}


export function isAuthenticated() {
  return Boolean(getAccessToken());
}


export function logoutUser() {
  sessionStorage.removeItem(TOKEN_KEY);
}


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
      response.status === 401
      && requiresAuth
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


export function registerUser(userDetails) {
  return apiRequest("/api/v1/auth/register", {
    method: "POST",
    body: userDetails,
  });
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
  return apiRequest("/api/v1/auth/me", {
    requiresAuth: true,
  });
}


export function askQuestion(question) {
  return apiRequest("/api/v1/ask", {
    method: "POST",
    body: {
      question,
    },
    requiresAuth: true,
  });
}