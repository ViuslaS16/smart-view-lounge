"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";
import { Smartphone, Check, AlertTriangle, Info, Wind, Monitor, Lightbulb, KeyRound } from "lucide-react";

type DeviceState = "idle" | "loading" | "success" | "error";

interface DeviceStatus {
  ac: DeviceState;
  projector: DeviceState;
  light: DeviceState;
  doorPin: DeviceState;
}

interface DoorPinResult {
  door_pin: string;
  message: string;
}

export default function AdminSettingsPage() {
  const { data, isLoading, mutate } = useApi<{ settings: Record<string, string> }>("/admin/settings");

  const [hourlyRate, setHourlyRate] = useState(2500);
  const [bufferMins, setBufferMins] = useState(15);
  const [minDuration, setMinDuration] = useState(60);
  const [timeIncrement, setTimeIncrement] = useState(30);
  const [incrementPrice, setIncrementPrice] = useState(1250);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Device states
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    ac: "idle", projector: "idle", light: "idle", doorPin: "idle",
  });
  const [deviceMsg, setDeviceMsg] = useState<Record<string, string>>({});
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);

  // Hydrate local state from API once loaded
  useEffect(() => {
    if (data?.settings) {
      setHourlyRate(Number(data.settings.price_per_hour) || 2500);
      setBufferMins(Number(data.settings.buffer_minutes) || 15);
      setMinDuration(Number(data.settings.min_duration_minutes) || 60);
      setTimeIncrement(Number(data.settings.time_increment_minutes) || 30);
      setIncrementPrice(Number(data.settings.time_increment_price) || 1250);
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
          min_duration_minutes: String(minDuration),
          time_increment_minutes: String(timeIncrement),
          time_increment_price: String(incrementPrice),
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

  async function controlDevice(
    key: keyof DeviceStatus,
    endpoint: string,
    body: object
  ) {
    setDeviceStatus((s) => ({ ...s, [key]: "loading" }));
    setDeviceMsg((m) => ({ ...m, [key]: "" }));
    if (key === "doorPin") setGeneratedPin(null);
    try {
      const res = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      }) as any;
      setDeviceStatus((s) => ({ ...s, [key]: "success" }));
      setDeviceMsg((m) => ({ ...m, [key]: res.message || "Done" }));
      if (key === "doorPin" && res.door_pin) setGeneratedPin(res.door_pin);
      // auto-reset to idle after 5s
      setTimeout(() => setDeviceStatus((s) => ({ ...s, [key]: "idle" })), 5000);
    } catch (err: any) {
      setDeviceStatus((s) => ({ ...s, [key]: "error" }));
      setDeviceMsg((m) => ({ ...m, [key]: err.message || "Failed" }));
      setTimeout(() => setDeviceStatus((s) => ({ ...s, [key]: "idle" })), 6000);
    }
  }

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading settings...</div>;
  }

  const btnStyle = (state: DeviceState, color: string) => ({
    flex: 1,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid var(--border-subtle)",
    cursor: state === "loading" ? "not-allowed" : "pointer",
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "all 0.18s ease",
    opacity: state === "loading" ? 0.6 : 1,
    background: state === "success" ? "rgba(52, 199, 89, 0.12)" : state === "error" ? "rgba(255, 59, 48, 0.1)" : "var(--bg-elevated)",
    color: state === "success" ? "var(--success)" : state === "error" ? "var(--danger)" : color,
  });

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
          Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Configure pricing, session parameters, and physical device controls.
        </p>
      </div>

      {/* Pricing & Session */}
      <section className="card" style={{ padding: "24px", marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Pricing &amp; Session Configuration</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>Changes apply to all new bookings immediately.</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Hourly Rate */}
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

          {/* Buffer */}
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

          {/* Minimum Duration */}
          <div>
            <label className="label">Minimum Duration (minutes)</label>
            <input
              type="number"
              className="input"
              value={minDuration}
              onChange={(e) => setMinDuration(Number(e.target.value))}
              min={30}
              step={30}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Shortest session a customer can book. Current: {minDuration} min
            </p>
          </div>

          {/* Time Increment */}
          <div>
            <label className="label">Time Increment (minutes)</label>
            <input
              type="number"
              className="input"
              value={timeIncrement}
              onChange={(e) => setTimeIncrement(Number(e.target.value))}
              min={15}
              step={15}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Step size for booking duration selector. Current: {timeIncrement} min
            </p>
          </div>

          {/* Increment Charge */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="label">Time Increment Charge (LKR)</label>
            <input
              type="number"
              className="input"
              value={incrementPrice}
              onChange={(e) => setIncrementPrice(Number(e.target.value))}
              min={0}
              step={250}
              style={{ maxWidth: 280 }}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Extra charge per {timeIncrement}-minute time increment. Current: LKR {incrementPrice.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* Device Controls */}
      <section className="card" style={{ padding: "24px", marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Device Controls</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
          Manually control lounge devices via Tuya IoT. Door PIN targets the currently active session.
        </p>

        {/* AC */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <Wind size={16} style={{ color: "var(--accent)" }} /> Air Conditioning
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              id="btn-ac-on"
              style={btnStyle(deviceStatus.ac, "var(--success)")}
              disabled={deviceStatus.ac === "loading"}
              onClick={() => controlDevice("ac", "/admin/devices/ac", { action: "on" })}
            >
              {deviceStatus.ac === "loading" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Wind size={14} />}
              Turn ON
            </button>
            <button
              id="btn-ac-off"
              style={btnStyle(deviceStatus.ac, "var(--text-secondary)")}
              disabled={deviceStatus.ac === "loading"}
              onClick={() => controlDevice("ac", "/admin/devices/ac", { action: "off" })}
            >
              {deviceStatus.ac === "loading" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Wind size={14} />}
              Turn OFF
            </button>
          </div>
          {deviceMsg.ac && (
            <p style={{ fontSize: 12, marginTop: 8, color: deviceStatus.ac === "error" ? "var(--danger)" : "var(--success)" }}>
              {deviceMsg.ac}
            </p>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", marginBottom: 20 }} />

        {/* Projector */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <Monitor size={16} style={{ color: "var(--accent)" }} /> Projector
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              id="btn-projector-on"
              style={btnStyle(deviceStatus.projector, "var(--success)")}
              disabled={deviceStatus.projector === "loading"}
              onClick={() => controlDevice("projector", "/admin/devices/projector", { action: "on" })}
            >
              {deviceStatus.projector === "loading" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Monitor size={14} />}
              Turn ON
            </button>
            <button
              id="btn-projector-off"
              style={btnStyle(deviceStatus.projector, "var(--text-secondary)")}
              disabled={deviceStatus.projector === "loading"}
              onClick={() => controlDevice("projector", "/admin/devices/projector", { action: "off" })}
            >
              {deviceStatus.projector === "loading" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Monitor size={14} />}
              Turn OFF
            </button>
          </div>
          {deviceMsg.projector && (
            <p style={{ fontSize: 12, marginTop: 8, color: deviceStatus.projector === "error" ? "var(--danger)" : "var(--success)" }}>
              {deviceMsg.projector}
            </p>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", marginBottom: 20 }} />

        {/* Light */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <Lightbulb size={16} style={{ color: "var(--accent)" }} /> Lights
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", background: "var(--bg-elevated)", padding: "2px 8px", borderRadius: 999 }}>
              Setup required
            </span>
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            Add the lights remote to the IR blaster in Smart Life to activate this control.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              id="btn-light-on"
              style={btnStyle(deviceStatus.light, "var(--success)")}
              disabled={deviceStatus.light === "loading"}
              onClick={() => controlDevice("light", "/admin/devices/light", { action: "on" })}
            >
              {deviceStatus.light === "loading" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Lightbulb size={14} />}
              Turn ON
            </button>
            <button
              id="btn-light-off"
              style={btnStyle(deviceStatus.light, "var(--text-secondary)")}
              disabled={deviceStatus.light === "loading"}
              onClick={() => controlDevice("light", "/admin/devices/light", { action: "off" })}
            >
              {deviceStatus.light === "loading" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Lightbulb size={14} />}
              Turn OFF
            </button>
          </div>
          {deviceMsg.light && (
            <p style={{ fontSize: 12, marginTop: 8, color: "var(--text-muted)" }}>
              {deviceMsg.light}
            </p>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", marginBottom: 20 }} />

        {/* Door PIN */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <KeyRound size={16} style={{ color: "var(--accent)" }} /> Door PIN
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            Generates a fresh PIN for the currently active session, replacing the existing one on the smart lock.
          </p>
          <button
            id="btn-door-pin"
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
              cursor: deviceStatus.doorPin === "loading" ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.18s ease",
              opacity: deviceStatus.doorPin === "loading" ? 0.6 : 1,
              background: deviceStatus.doorPin === "success" ? "rgba(52,199,89,0.12)" : deviceStatus.doorPin === "error" ? "rgba(255,59,48,0.1)" : "linear-gradient(135deg, #C9933A, #A87828)",
              color: deviceStatus.doorPin === "error" ? "var(--danger)" : deviceStatus.doorPin === "success" ? "var(--success)" : "#0A0A0B",
            }}
            disabled={deviceStatus.doorPin === "loading"}
            onClick={() => controlDevice("doorPin", "/admin/devices/door-pin", {})}
          >
            {deviceStatus.doorPin === "loading"
              ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> Generating...</>
              : <><KeyRound size={14} /> Generate Door PIN for Active Session</>
            }
          </button>
          {generatedPin && (
            <div style={{
              marginTop: 14, padding: "14px 18px",
              background: "rgba(201,147,58,0.08)", borderRadius: 10,
              border: "1px solid rgba(201,147,58,0.25)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>New Door PIN</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "var(--accent)", letterSpacing: 3 }}>
                {generatedPin}
              </span>
            </div>
          )}
          {deviceMsg.doorPin && !generatedPin && (
            <p style={{ fontSize: 12, marginTop: 8, color: deviceStatus.doorPin === "error" ? "var(--danger)" : "var(--success)" }}>
              {deviceMsg.doorPin}
            </p>
          )}
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

      {/* SMS Configuration */}
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
