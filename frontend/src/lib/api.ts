const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

export async function apiFetch<T>(
  path: string,
  token?: string | null,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const raw = await response.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (response.status === 401) {
      throw new Error("unauthorized");
    }
    throw new Error(parsed?.error || raw || "Request failed");
  }

  return response.json();
}

export { API_BASE };
