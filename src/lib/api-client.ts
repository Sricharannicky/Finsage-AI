// API client for frontend - server-side fetch wrapper with credentials

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

// URLs that should silently return null on 401 (background polling, lazy widgets, etc.)
// Auth endpoints (/api/auth/login, /api/auth/register, /api/auth/me) are NOT here
const SILENT_401_URLS = [
  "/api/notifications",
  "/api/recurring",
  "/api/achievements",
  "/api/ai/",
  "/api/dashboard/",
  "/api/goals/projection",
  "/api/calendar",
  "/api/categories",
  "/api/recurring-list",
  "/api/networth",
  "/api/currency",
  "/api/bills",
  "/api/investments",
  "/api/challenges",
  "/api/income",
  "/api/expenses",
  "/api/budgets",
  "/api/goals",
  "/api/reports",
  "/api/settings",
];

function isSilent401(url: string, status: number): boolean {
  return status === 401 && SILENT_401_URLS.some((u) => url.startsWith(u));
}

// Get token from localStorage (set by auth-store persist)
function getToken(): string | null {
  try {
    const stored = localStorage.getItem("finsage-auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.token || null;
    }
  } catch {}
  return null;
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // Add token from localStorage as fallback (in case cookies don't work through proxy)
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && data.error) ||
      `Request failed with status ${res.status}`;

    if (isSilent401(url, res.status)) {
      return null as T;
    }

    throw new ApiError(message, res.status);
  }

  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: "GET" }),
  post: <T>(url: string, body?: any) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body: any) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
