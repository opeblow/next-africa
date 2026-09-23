/**
 * Lightweight error-reporting hook with no hard monitoring dependency.
 *
 * To wire a provider (Sentry, GlitchTip, custom collector), set
 * `VITE_ERROR_REPORT_URL` in the environment, or install `@sentry/react` and
 * call `Sentry.init()` in main.jsx. Everything here is a no-op without it.
 */
const REPORT_URL = import.meta.env.VITE_ERROR_REPORT_URL;

export function reportError(error, context = {}) {
  if (import.meta.env.DEV) console.error("[monitoring]", error, context);
  if (!REPORT_URL) return;
  try {
    const payload = JSON.stringify({
      message: String(error?.message || error || "Unknown error"),
      context,
      url: typeof location !== "undefined" ? location.href : "",
      ts: Date.now(),
    });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(REPORT_URL, payload);
    } else {
      fetch(REPORT_URL, { method: "POST", body: payload, keepalive: true }).catch(() => {});
    }
  } catch {
    // Monitoring must never break the app.
  }
}
