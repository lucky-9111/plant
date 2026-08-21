const BASE = "/api";

// FastAPI's own request-validation errors (422) send `detail` as an array of
// { loc, msg } objects rather than a plain string like the app's custom
// HTTPException responses do -- without this, new Error(detail) would
// stringify that array into the unreadable "[object Object]".
function formatDetail(detail, fallback) {
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail.map((err) => {
      const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : null;
      const msg = err.msg || "Invalid value";
      return typeof field === "string" ? `${field}: ${msg}` : msg;
    });
    return messages.join("; ");
  }
  return fallback;
}

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
      detail = formatDetail(data.detail, detail);
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
      detail = formatDetail(data.detail, detail);
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
