export const STORAGE_KEYS = {
  token: "next-token",
  user: "next-user",
  userId: "next-user-id",
  proactivity: "next-proactivity-level",
  goal: "next-goal",
};

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function currentUser() {
  return readJSON(STORAGE_KEYS.user, {});
}

export function userInitials() {
  const parts = (currentUser().name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length
    ? parts
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "PA";
}

export function getGoal() {
  return readJSON(STORAGE_KEYS.goal, null);
}

export function saveGoal(goal) {
  localStorage.setItem(STORAGE_KEYS.goal, JSON.stringify(goal));
}

export function clearSession() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}
