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
  }).catch(() => { throw new Error("Could not reach NEXT Africa. Check your connection and try again; your last saved progress is unchanged."); });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Something went wrong");
  return body;
}
