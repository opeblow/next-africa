import * as chrono from "chrono-node";
import { DateTime } from "luxon";

// The model copies the date phrase; calendar arithmetic belongs to code.
export function resolveDueDate(phrase, timezone, now = new Date()) {
  if (!phrase) return null;
  const iso = /^\d{4}-\d{2}-\d{2}T/.test(phrase) ? DateTime.fromISO(phrase, { zone: timezone }) : null;
  if (iso?.isValid) return iso.toUTC().toISO();
  const localNow = DateTime.fromJSDate(now, { zone: timezone });
  const matches = chrono.en.parse(phrase, { instant: now, timezone: localNow.offset }, { forwardDate: true });
  if (matches.length !== 1) throw new Error(`Please give one clear date for “${phrase}”.`);
  const parts = matches[0].start;
  if (parts.isCertain("timezoneOffset")) return parts.date().toISOString();
  const values = Object.fromEntries(["year", "month", "day", "hour", "minute", "second"].map(key => [key, parts.get(key)]));
  // Date-only commitments are due at the end of the local day.
  if (!parts.isCertain("hour")) Object.assign(values, { hour: 23, minute: 59, second: 0 });
  const date = DateTime.fromObject(values, { zone: timezone });
  if (!date.isValid) throw new Error("Please clarify the deadline.");
  return date.toUTC().toISO();
}
