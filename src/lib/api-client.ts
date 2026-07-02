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
// These are called from components with .catch() or optional chaining, so null is safe
const SILENT_401_URLS = [
  "/api/notifications",
  "/api/recurring",
  "/api/achievements",
  "/api/ai/coach",
  "/api/ai/cached-insights",
  "/api/dashboard/velocity",
  "/api/dashboard/savings-rate",
  "/api/dashboard/comparison",
  "/api/dashboard/summary",
  "/api/ai/health-score",
  "/api/ai/anomaly",
  "/api/ai/investment-insights",
  "/api/ai/smart-budget",
  "/api/ai/benchmark",
  "/api/ai/scenario",
  "/api/ai/debt-payoff",
  "/api/ai/tax-suggestions",
  "/api/ai/budget-suggestion",
  "/api/ai/weekly-report",
  "/api/ai/analysis",
  "/api/ai/prediction",
  "/api/ai/insights",
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

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
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

    // For 401 on background/polling URLs, return null silently (no throw, no console error)
    // Components handle null gracefully with optional chaining and default values
    if (isSilent401(url, res.status)) {
      return null as T;
    }

    // For critical 401s (dashboard summary, auth), throw so components can handle
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
