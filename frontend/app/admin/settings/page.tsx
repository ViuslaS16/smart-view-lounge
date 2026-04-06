"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";
import { Smartphone, Check, AlertTriangle, Info } from "lucide-react";

export default function AdminSettingsPage() {
  const { data, isLoading, mutate } = useApi<{ settings: Record<string, string> }>("/admin/settings");

  const [hourlyRate, setHourlyRate] = useState(2500);
  const [bufferMins, setBufferMins] = useState(15);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Hydrate local state from API once loaded
  useEffect(() => {
    if (data?.settings) {
      setHourlyRate(Number(data.settings.price_per_hour) || 2500);
      setBufferMins(Number(data.settings.buffer_minutes) || 15);
    }
  }, [data]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await apiFetch("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          price_per_hour: String(hourlyRate),
          buffer_minutes: String(bufferMins),
        }),
      });
      mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading settings...</div>;
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
          Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Configure pricing and session buffer. Changes apply to all new bookings immediately.
        </p>
      </div>

      {/* Pricing */}
      <section className="card" style={{ padding: "24px", marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Pricing &amp; Session Configuration</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>Changes apply to all new bookings immediately.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <label className="label">Hourly Rate (LKR)</label>
            <input
              type="number"
              className="input"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              min={500}
              step={250}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Current: LKR {hourlyRate.toLocaleString()} per hour
            </p>
          </div>
          <div>
            <label className="label">Session Buffer (minutes)</label>
            <input
              type="number"
              className="input"
              value={bufferMins}
              onChange={(e) => setBufferMins(Number(e.target.value))}
              min={5}
              step={5}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Gap between sessions for cleaning. Current: {bufferMins} min
            </p>
          </div>
          <div>
            <label className="label">Minimum Duration</label>
            <input type="text" className="input" value="60 minutes (1 hour)" disabled style={{ opacity: 0.5 }} />
          </div>
          <div>
            <label className="label">Time Increment</label>
            <input type="text" className="input" value="30 minutes" disabled style={{ opacity: 0.5 }} />
          </div>
        </div>
      </section>

      {/* Google Calendar */}
      <section className="card" style={{ padding: "24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Google Calendar Integration</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              Auto-create calendar events for every confirmed booking with 30-minute popup reminders.
            </p>
          </div>
          <span className="badge badge-pending">Not Configured</span>
        </div>
        <div className="alert" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", fontSize: 13 }}>
          <span style={{ display: "flex", alignItems: "center" }}><Info size={16} /></span>
          <div>
            Configure <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4 }}>GOOGLE_CLIENT_EMAIL</code>, <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4 }}>GOOGLE_PRIVATE_KEY</code>, and <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4 }}>GOOGLE_CALENDAR_ID</code> in the backend .env to enable Google Calendar sync.
          </div>
        </div>
      </section>

      {/* SMS Templates info */}
      <section className="card" style={{ padding: "24px", marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>SMS Configuration</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          SMS is sent via Dialog eSMS. Configure credentials in the backend .env file.
        </p>
        <div className="alert" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", fontSize: 13 }}>
          <span style={{ display: "flex", alignItems: "center" }}><Smartphone size={16} /></span>
          <div>
            Set <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4 }}>DIALOG_ESMS_URL</code>, <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4 }}>DIALOG_ESMS_USERNAME</code>, and <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4 }}>DIALOG_ESMS_PASSWORD</code> in backend .env to enable SMS notifications.
          </div>
        </div>
      </section>

      {/* Save */}
      {error && (
        <div className="alert alert-error animate-fade-up" style={{ marginBottom: 16 }}>
          <span style={{ display: "flex", alignItems: "center" }}><AlertTriangle size={16} /></span> {error}
        </div>
      )}
      {saved && (
        <div className="alert alert-success animate-fade-up" style={{ marginBottom: 16 }}>
          <span style={{ display: "flex", alignItems: "center" }}><Check size={16} /></span> Settings saved successfully!
        </div>
      )}

      <button
        className="btn btn-primary btn-lg"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? <span className="spinner" /> : null}
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
