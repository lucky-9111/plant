const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    ...options,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // ignore non-JSON error bodies
    }
    const error = new Error(detail);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

async function requestPaged(path) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // ignore non-JSON error bodies
    }
    const error = new Error(detail);
    error.status = res.status;
    throw error;
  }

  const items = await res.json();
  return {
    items,
    total: Number(res.headers.get("X-Total-Count") ?? items.length),
    page: Number(res.headers.get("X-Page") ?? 1),
    pages: Number(res.headers.get("X-Total-Pages") ?? 1),
  };
}

export const api = {
  get: (path) => request(path),
  getPaged: (path) => requestPaged(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
};
