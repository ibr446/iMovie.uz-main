/**
 * iMovie.uz API Client
 * Centralized API helper for communicating with the FastAPI backend.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? // Vercel rewrites already route /api/* -> backend
      '/api'
    : `http://${window.location.hostname}:8000/api`);

const PROD_REQUEST_TIMEOUT_MS = 15000;


function getToken(): string | null {
  return localStorage.getItem('imovie-token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    const detail = error.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg || item.message || String(item)).join(' ')
      : detail;
    throw new Error(message || `HTTP ${response.status}`);
  }
  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PROD_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        ...authHeaders(),
      },
      signal: controller.signal,
    });
    return handleResponse<T>(response);
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      ...authHeaders(),
    },
  });
  return handleResponse<void>(response);
}
