import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export default function ReminderSettings() {
  const [timezone, setTimezone] = useState(() => localStorage.getItem("next-timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [message, setMessage] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/api/settings").then(settings => {
      setTimezone(settings.timezone); localStorage.setItem("next-timezone", settings.timezone);
    }).catch(err => setMessage(err.message));
    if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistration().then(reg => reg?.pushManager.getSubscription()).then(sub => setEnabled(Boolean(sub))).catch(() => {});
  }, []);
  const saveTimezone = async () => {
    setBusy(true); setMessage("");
    try {
      await api("/api/settings", { method: "PATCH", body: JSON.stringify({ timezone }) });
      localStorage.setItem("next-timezone", timezone); setMessage("Timezone saved for new captures and reminders.");
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  };
  const toggle = async () => {
    setBusy(true); setMessage("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("This browser does not support background reminders. You can still use the reminders page.");
      if (enabled) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) { await api("/api/notifications/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
        setEnabled(false); setMessage("Background reminders disabled."); return;
      }
      const config = await api("/api/notifications/config");
      if (!config.available) throw new Error("Background reminders are not configured on this server yet.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notifications were not enabled. You can change this in your browser settings.");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const key = config.publicKey.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(key.padEnd(Math.ceil(key.length / 4) * 4, "=")), c => c.charCodeAt(0));
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
      try { await api("/api/notifications/subscribe", { method: "POST", body: JSON.stringify(sub.toJSON()) }); }
      catch (err) { if (!existing) await sub.unsubscribe(); throw err; }
      setEnabled(true); setMessage("Enabled. You’ll receive a private daily summary when something needs attention.");
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  };
  return <section className="copilot-card" style={{ marginTop: 24 }}>
    <h2>Local time and background reminders</h2>
    <label>Your timezone<select value={timezone} onChange={e => setTimezone(e.target.value)} disabled={busy}>
      {[...new Set([timezone, "Africa/Lagos", "Africa/Nairobi", "Africa/Kampala", "Africa/Accra", ...Intl.supportedValuesOf("timeZone")])].sort().map(zone => <option key={zone}>{zone}</option>)}
    </select></label>
    <div className="copilot-btn-group"><button className="btn-secondary-light" disabled={busy} onClick={saveTimezone}>Save timezone</button>
    <button className="btn-primary-purple" disabled={busy} onClick={toggle}>{enabled ? "Disable background reminders" : "Enable background reminders"}</button></div>
    <p>Optional notifications can arrive with this page closed. Your browser and device must support push. Task details stay out of the notification.</p>
    <p role="status">{message}</p>
  </section>;
}
