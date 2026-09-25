export function formatDue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toLocaleString(undefined, {
    timeZone: localStorage.getItem("next-timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Percentage of a commitment chain that is marked done. */
export function progressOf(commitments = []) {
  const total = commitments.length;
  if (!total) return 0;
  const done = commitments.filter((commitment) => commitment.status === "done").length;
  return Math.round((done / total) * 100);
}
