export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/** Thin JSON fetch wrapper that attaches the stored bearer token. */
export async function api(path, options = {}) {
  const token = localStorage.getItem("next-token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Something went wrong");
  return body;
}
