"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";
import { Smartphone, Check, AlertTriangle, Wind, Monitor, Lightbulb, KeyRound, ShieldCheck, Trash2 } from "lucide-react";

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
  const [dirty, setDirty] = useState(false);

  // Admin mobile state
  type MobileUiState = 'idle' | 'entering' | 'otp_sent' | 'removing';
  const [mobileUiState, setMobileUiState] = useState<MobileUiState>('idle');
  const [hasMobile, setHasMobile]         = useState(false);
  const [maskedMobile, setMaskedMobile]   = useState<string | null>(null);
  const [newMobile, setNewMobile]         = useState('');
  const [mobileOtp, setMobileOtp]         = useState('');
  const [mobileSaving, setMobileSaving]   = useState(false);
  const [mobileMsg, setMobileMsg]         = useState('');
  const [mobileErr, setMobileErr]         = useState('');

  // Device states
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    ac: "idle", projector: "idle", light: "idle", doorPin: "idle",
  });
  const [deviceMsg, setDeviceMsg] = useState<Record<string, string>>({});
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);

  // Responsive: detect narrow screen
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Hydrate local state from API once loaded
  useEffect(() => {
    if (data?.settings) {
      setHourlyRate(Number(data.settings.price_per_hour) || 2500);
      setBufferMins(Number(data.settings.buffer_minutes) || 15);
      setMinDuration(Number(data.settings.min_duration_minutes) || 60);
      setTimeIncrement(Number(data.settings.time_increment_minutes) || 30);
      setIncrementPrice(Number(data.settings.time_increment_price) || 1250);
      setDirty(false);
    }
  }, [data]);

  // Load admin mobile status
  useEffect(() => {
    apiFetch('/admin/mobile').then((res: any) => {
      setHasMobile(res.has_mobile);
      setMaskedMobile(res.mobile);
    }).catch(() => {});
  }, []);

  async function refreshAdminMobile() {
    const res: any = await apiFetch('/admin/mobile');
    setHasMobile(res.has_mobile);
    setMaskedMobile(res.mobile);
  }

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
      setDirty(false);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendMobileOtp(mobile: string) {
    setMobileSaving(true); setMobileErr(''); setMobileMsg('');
    try {
      await apiFetch('/admin/mobile/send-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile }),
      });
      setMobileMsg('OTP sent! Check your phone.');
      setMobileUiState(hasMobile ? 'removing' : 'otp_sent');
    } catch (err: any) {
      setMobileErr(err.message || 'Failed to send OTP');
    } finally {
      setMobileSaving(false);
    }
  }

  async function handleVerifySet() {
    setMobileSaving(true); setMobileErr('');
    try {
      await apiFetch('/admin/mobile/verify-set', {
        method: 'POST',
        body: JSON.stringify({ mobile: newMobile, otp: mobileOtp }),
      });
      await refreshAdminMobile();
      setMobileUiState('idle');
      setNewMobile(''); setMobileOtp(''); setMobileMsg('');
    } catch (err: any) {
      setMobileErr(err.message || 'Invalid OTP');
    } finally {
      setMobileSaving(false);
    }
  }

  async function handleVerifyRemove() {
    setMobileSaving(true); setMobileErr('');
    try {
      await apiFetch('/admin/mobile/verify-remove', {
        method: 'POST',
        body: JSON.stringify({ otp: mobileOtp }),
      });
      await refreshAdminMobile();
      setMobileUiState('idle');
      setMobileOtp(''); setMobileMsg('');
    } catch (err: any) {
      setMobileErr(err.message || 'Invalid OTP');
    } finally {
      setMobileSaving(false);
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
    minWidth: isNarrow ? "100%" : 0,
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
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: isNarrow ? 22 : 28, fontWeight: 700, marginBottom: 6 }}>
          Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Configure pricing, session parameters, and physical device controls.
        </p>
      </div>

      {/* Pricing & Session */}
      <section className="card" style={{ padding: isNarrow ? "16px" : "24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Pricing &amp; Session Configuration</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Changes apply to all new bookings immediately.</p>
          </div>
          {dirty && !saved && (
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.4px",
              color: "var(--warning)", background: "rgba(255,159,10,0.1)",
              border: "1px solid rgba(255,159,10,0.25)",
              padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
            }}>
              ● Unsaved changes
            </span>
          )}
        </div>

        {/* Responsive 2-col grid — stacks on mobile */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
          gap: isNarrow ? 16 : 20,
          marginTop: 24,
        }}>
          {/* Hourly Rate */}
          <div>
            <label className="label">Hourly Rate (LKR)</label>
            <input
              type="number"
              className="input"
              value={hourlyRate}
              onChange={(e) => { setHourlyRate(Number(e.target.value)); setDirty(true); }}
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
              onChange={(e) => { setBufferMins(Number(e.target.value)); setDirty(true); }}
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
              onChange={(e) => { setMinDuration(Number(e.target.value)); setDirty(true); }}
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
              onChange={(e) => { setTimeIncrement(Number(e.target.value)); setDirty(true); }}
              min={15}
              step={15}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Step size for booking duration selector. Current: {timeIncrement} min
            </p>
          </div>

          {/* Increment Charge — full width */}
          <div style={{ gridColumn: isNarrow ? "1" : "1 / -1" }}>
            <label className="label">Time Increment Charge (LKR)</label>
            <input
              type="number"
              className="input"
              value={incrementPrice}
              onChange={(e) => { setIncrementPrice(Number(e.target.value)); setDirty(true); }}
              min={0}
              step={250}
              style={{ maxWidth: isNarrow ? "100%" : 280 }}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Extra charge per {timeIncrement}-minute time increment. Current: LKR {incrementPrice.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Save button row */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button
            id="btn-save-pricing"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: isNarrow ? "100%" : 180 }}
          >
            {saving ? <span className="spinner" /> : null}
            {saving ? "Saving..." : "Save Configuration"}
          </button>

          {saved && !saving && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--success)" }}>
              <Check size={15} /> Saved — booking page will reflect new values immediately.
            </span>
          )}
          {error && !saving && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>
              <AlertTriangle size={15} /> {error}
            </span>
          )}
        </div>
      </section>

      {/* Admin Alert Mobile */}
      <section className="card" style={{ padding: isNarrow ? "16px" : "24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <Smartphone size={18} style={{ color: "var(--accent)" }} />
              Admin Alert Mobile
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Receives SMS when new users register and when automation fails. OTP-verified.
            </p>
          </div>
          {hasMobile && (
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.4px",
              color: "var(--success)", background: "rgba(52,199,89,0.1)",
              border: "1px solid rgba(52,199,89,0.25)",
              padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
            }}>
              ✓ Active
            </span>
          )}
        </div>

        {/* Idle + has mobile */}
        {hasMobile && mobileUiState === 'idle' && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 10,
            background: "var(--bg-elevated)", borderRadius: 10, padding: "12px 16px",
            border: "1px solid var(--border-subtle)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShieldCheck size={16} style={{ color: "var(--success)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>
                {maskedMobile}
              </span>
            </div>
            <button
              id="btn-remove-admin-mobile"
              onClick={() => {
                setMobileErr(''); setMobileMsg('');
                handleSendMobileOtp(maskedMobile ?? '');
                setMobileUiState('removing');
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 12,
                fontWeight: 600, color: "var(--danger)", background: "rgba(255,59,48,0.08)",
                border: "1px solid rgba(255,59,48,0.2)", borderRadius: 8,
                padding: "6px 12px", cursor: "pointer",
              }}
            >
              <Trash2 size={13} /> Remove
            </button>
          </div>
        )}

        {/* Idle + no mobile */}
        {!hasMobile && mobileUiState === 'idle' && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="label">Mobile Number</label>
              <input
                id="input-admin-mobile"
                className="input"
                type="tel"
                placeholder="07XXXXXXXX"
                value={newMobile}
                onChange={(e) => setNewMobile(e.target.value)}
              />
            </div>
            <button
              id="btn-send-mobile-otp"
              className="btn btn-primary"
              disabled={mobileSaving || !newMobile}
              onClick={() => { setMobileErr(''); handleSendMobileOtp(newMobile); setMobileUiState('entering'); }}
              style={{ whiteSpace: "nowrap", minWidth: isNarrow ? "100%" : "auto" }}
            >
              {mobileSaving ? <span className="spinner" /> : <Smartphone size={14} />}
              {mobileSaving ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        )}

        {/* OTP sent — verify & save */}
        {(mobileUiState === 'otp_sent' || mobileUiState === 'entering') ? (
          <div>
            {mobileMsg && (
              <p style={{ fontSize: 13, color: "var(--success)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={14} /> {mobileMsg}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="label">Enter OTP sent to {newMobile}</label>
                <input
                  id="input-admin-mobile-otp"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="______"
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: 4, fontSize: 18 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", minWidth: isNarrow ? "100%" : "auto" }}>
                <button
                  id="btn-verify-set-mobile"
                  className="btn btn-primary"
                  disabled={mobileSaving || mobileOtp.length < 6}
                  onClick={handleVerifySet}
                  style={{ flex: 1 }}
                >
                  {mobileSaving ? <span className="spinner" /> : <ShieldCheck size={14} />}
                  {mobileSaving ? 'Verifying...' : 'Verify & Save'}
                </button>
                <button
                  onClick={() => { setMobileUiState('idle'); setMobileOtp(''); setMobileMsg(''); setMobileErr(''); }}
                  style={{
                    padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)",
                    background: "var(--bg-elevated)", cursor: "pointer", fontSize: 13, flex: isNarrow ? 1 : "none",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Removing — verify OTP to remove */}
        {mobileUiState === 'removing' && (
          <div style={{ marginTop: 12 }}>
            {mobileMsg && (
              <p style={{ fontSize: 13, color: "var(--success)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={14} /> {mobileMsg}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="label">Enter OTP sent to {maskedMobile} to confirm removal</label>
                <input
                  id="input-remove-mobile-otp"
                  className="input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="______"
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ''))}
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: 4, fontSize: 18 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", minWidth: isNarrow ? "100%" : "auto" }}>
                <button
                  id="btn-confirm-remove-mobile"
                  disabled={mobileSaving || mobileOtp.length < 6}
                  onClick={handleVerifyRemove}
                  style={{
                    padding: "10px 16px", borderRadius: 10, fontWeight: 600, fontSize: 13,
                    border: "1px solid rgba(255,59,48,0.3)",
                    cursor: mobileSaving || mobileOtp.length < 6 ? "not-allowed" : "pointer",
                    background: "rgba(255,59,48,0.1)", color: "var(--danger)",
                    display: "flex", alignItems: "center", gap: 6,
                    opacity: mobileSaving || mobileOtp.length < 6 ? 0.5 : 1,
                    flex: 1,
                  }}
                >
                  {mobileSaving ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Trash2 size={13} />}
                  {mobileSaving ? 'Removing...' : 'Confirm Remove'}
                </button>
                <button
                  onClick={() => { setMobileUiState('idle'); setMobileOtp(''); setMobileMsg(''); setMobileErr(''); }}
                  style={{
                    padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)",
                    background: "var(--bg-elevated)", cursor: "pointer", fontSize: 13,
                    flex: isNarrow ? 1 : "none",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {mobileErr && (
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} /> {mobileErr}
          </p>
        )}
      </section>

      {/* Device Controls */}
      <section className="card" style={{ padding: isNarrow ? "16px" : "24px", marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Device Controls</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
          Manually control lounge devices via Tuya IoT. Door PIN targets the currently active session.
        </p>

        {/* AC */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <Wind size={16} style={{ color: "var(--accent)" }} /> Air Conditioning
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: isNarrow ? "wrap" : "nowrap" }}>
            <button id="btn-ac-on" style={btnStyle(deviceStatus.ac, "var(--success)")}
              disabled={deviceStatus.ac === "loading"}
              onClick={() => controlDevice("ac", "/admin/devices/ac", { action: "on" })}>
              {deviceStatus.ac === "loading" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Wind size={14} />}
              Turn ON
            </button>
            <button id="btn-ac-off" style={btnStyle(deviceStatus.ac, "var(--text-secondary)")}
              disabled={deviceStatus.ac === "loading"}
              onClick={() => controlDevice("ac", "/admin/devices/ac", { action: "off" })}>
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
          <div style={{ display: "flex", gap: 10, flexWrap: isNarrow ? "wrap" : "nowrap" }}>
            <button id="btn-projector-on" style={btnStyle(deviceStatus.projector, "var(--success)")}
              disabled={deviceStatus.projector === "loading"}
              onClick={() => controlDevice("projector", "/admin/devices/projector", { action: "on" })}>
              {deviceStatus.projector === "loading" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Monitor size={14} />}
              Turn ON
            </button>
            <button id="btn-projector-off" style={btnStyle(deviceStatus.projector, "var(--text-secondary)")}
              disabled={deviceStatus.projector === "loading"}
              onClick={() => controlDevice("projector", "/admin/devices/projector", { action: "off" })}>
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
          <div style={{ display: "flex", gap: 10, flexWrap: isNarrow ? "wrap" : "nowrap" }}>
            <button id="btn-light-on" style={btnStyle(deviceStatus.light, "var(--success)")}
              disabled={deviceStatus.light === "loading"}
              onClick={() => controlDevice("light", "/admin/devices/light", { action: "on" })}>
              {deviceStatus.light === "loading" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Lightbulb size={14} />}
              Turn ON
            </button>
            <button id="btn-light-off" style={btnStyle(deviceStatus.light, "var(--text-secondary)")}
              disabled={deviceStatus.light === "loading"}
              onClick={() => controlDevice("light", "/admin/devices/light", { action: "off" })}>
              {deviceStatus.light === "loading" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Lightbulb size={14} />}
              Turn OFF
            </button>
          </div>
          {deviceMsg.light && (
            <p style={{ fontSize: 12, marginTop: 8, color: "var(--text-muted)" }}>{deviceMsg.light}</p>
          )}
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", marginBottom: 20 }} />

        {/* Door PIN */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <KeyRound size={16} style={{ color: "var(--accent)" }} /> Door PIN — Admin Access
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            Generates a 30-minute admin access PIN on the smart lock.
            Only works when <strong>no customer session is running</strong> — if a session is active, the customer&apos;s PIN is protected.
          </p>
          <button
            id="btn-door-pin"
            style={{
              width: isNarrow ? "100%" : "auto",
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
              cursor: deviceStatus.doorPin === "loading" ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
              : <><KeyRound size={14} /> Generate Admin Access PIN</>
            }
          </button>
          {generatedPin && (
            <div style={{
              marginTop: 14, padding: "14px 18px",
              background: "rgba(201,147,58,0.08)", borderRadius: 10,
              border: "1px solid rgba(201,147,58,0.25)",
            }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>Admin Door PIN — Valid 30 min</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Enter on keypad:</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "var(--accent)", letterSpacing: 3 }}>
                  {generatedPin}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Press the PIN digits followed by # on the door keypad.</p>
            </div>
          )}
          {deviceMsg.doorPin && !generatedPin && (
            <p style={{ fontSize: 12, marginTop: 8, color: deviceStatus.doorPin === "error" ? "var(--danger)" : "var(--success)" }}>
              {deviceMsg.doorPin}
            </p>
          )}
        </div>
      </section>

    </div>
  );
}


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

  // Track "dirty" state — true when local values differ from what's in DB
  const [dirty, setDirty] = useState(false);

  // Admin mobile state
  type MobileUiState = 'idle' | 'entering' | 'otp_sent' | 'removing';
  const [mobileUiState, setMobileUiState] = useState<MobileUiState>('idle');
  const [hasMobile, setHasMobile]         = useState(false);
  const [maskedMobile, setMaskedMobile]   = useState<string | null>(null);
  const [newMobile, setNewMobile]         = useState('');
  const [mobileOtp, setMobileOtp]         = useState('');
  const [mobileSaving, setMobileSaving]   = useState(false);
  const [mobileMsg, setMobileMsg]         = useState('');
  const [mobileErr, setMobileErr]         = useState('');

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
      setDirty(false); // reset dirty on fresh load
    }
  }, [data]);

  // Load admin mobile status
  useEffect(() => {
    apiFetch('/admin/mobile').then((res: any) => {
      setHasMobile(res.has_mobile);
      setMaskedMobile(res.mobile);
    }).catch(() => {});
  }, []);

  async function refreshAdminMobile() {
    const res: any = await apiFetch('/admin/mobile');
    setHasMobile(res.has_mobile);
    setMaskedMobile(res.mobile);
  }

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
      setDirty(false);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendMobileOtp(mobile: string) {
    setMobileSaving(true); setMobileErr(''); setMobileMsg('');
    try {
      await apiFetch('/admin/mobile/send-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile }),
      });
      setMobileMsg('OTP sent! Check your phone.');
      setMobileUiState(hasMobile ? 'removing' : 'otp_sent');
    } catch (err: any) {
      setMobileErr(err.message || 'Failed to send OTP');
    } finally {
      setMobileSaving(false);
    }
  }

  async function handleVerifySet() {
    setMobileSaving(true); setMobileErr('');
    try {
      await apiFetch('/admin/mobile/verify-set', {
        method: 'POST',
        body: JSON.stringify({ mobile: newMobile, otp: mobileOtp }),
      });
      await refreshAdminMobile();
      setMobileUiState('idle');
      setNewMobile(''); setMobileOtp(''); setMobileMsg('');
    } catch (err: any) {
      setMobileErr(err.message || 'Invalid OTP');
    } finally {
      setMobileSaving(false);
    }
  }

  async function handleVerifyRemove() {
    setMobileSaving(true); setMobileErr('');
    try {
      await apiFetch('/admin/mobile/verify-remove', {
        method: 'POST',
        body: JSON.stringify({ otp: mobileOtp }),
      });
      await refreshAdminMobile();
      setMobileUiState('idle');
      setMobileOtp(''); setMobileMsg('');
    } catch (err: any) {
      setMobileErr(err.message || 'Invalid OTP');
    } finally {
      setMobileSaving(false);
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
        {/* Section header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Pricing &amp; Session Configuration</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Changes apply to all new bookings immediately.</p>
          </div>
          {dirty && !saved && (
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.4px",
              color: "var(--warning)", background: "rgba(255,159,10,0.1)",
              border: "1px solid rgba(255,159,10,0.25)",
              padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
            }}>
              ● Unsaved changes
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
          {/* Hourly Rate */}
          <div>
            <label className="label">Hourly Rate (LKR)</label>
            <input
              type="number"
              className="input"
              value={hourlyRate}
              onChange={(e) => { setHourlyRate(Number(e.target.value)); setDirty(true); }}
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
              onChange={(e) => { setBufferMins(Number(e.target.value)); setDirty(true); }}
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
              onChange={(e) => { setMinDuration(Number(e.target.value)); setDirty(true); }}
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
              onChange={(e) => { setTimeIncrement(Number(e.target.value)); setDirty(true); }}
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
              onChange={(e) => { setIncrementPrice(Number(e.target.value)); setDirty(true); }}
              min={0}
              step={250}
              style={{ maxWidth: 280 }}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Extra charge per {timeIncrement}-minute time increment. Current: LKR {incrementPrice.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Inline save feedback + button */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button
            id="btn-save-pricing"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: 180 }}
          >
            {saving ? <span className="spinner" /> : null}
            {saving ? "Saving..." : "Save Configuration"}
          </button>

          {saved && !saving && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--success)" }}>
              <Check size={15} /> Saved — booking page will reflect new values immediately.
            </span>
          )}
          {error && !saving && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>
              <AlertTriangle size={15} /> {error}
            </span>
          )}
        </div>
      </section>

      {/* Admin Alert Mobile */}
      <section className="card" style={{ padding: "24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <Smartphone size={18} style={{ color: "var(--accent)" }} />
              Admin Alert Mobile
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Receives SMS when new users register and when automation fails. OTP-verified.
            </p>
          </div>
          {hasMobile && (
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.4px",
              color: "var(--success)", background: "rgba(52,199,89,0.1)",
              border: "1px solid rgba(52,199,89,0.25)",
              padding: "3px 10px", borderRadius: 999,
            }}>
              ✓ Active
            </span>
          )}
        </div>

        {/* State: idle + has mobile */}
        {hasMobile && mobileUiState === 'idle' && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--bg-elevated)", borderRadius: 10, padding: "12px 16px",
            border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShieldCheck size={16} style={{ color: "var(--success)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, letterSpacing: 2 }}>
                {maskedMobile}
              </span>
            </div>
            <button
              id="btn-remove-admin-mobile"
              onClick={() => {
                setMobileErr(''); setMobileMsg('');
                handleSendMobileOtp(maskedMobile ?? '');
                setMobileUiState('removing');
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 12,
                fontWeight: 600, color: "var(--danger)", background: "rgba(255,59,48,0.08)",
                border: "1px solid rgba(255,59,48,0.2)", borderRadius: 8,
                padding: "6px 12px", cursor: "pointer",
              }}
            >
              <Trash2 size={13} /> Remove
            </button>
          </div>
        )}

        {/* State: idle + no mobile */}
        {!hasMobile && mobileUiState === 'idle' && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label className="label">Mobile Number</label>
              <input
                id="input-admin-mobile"
                className="input"
                type="tel"
                placeholder="07XXXXXXXX"
                value={newMobile}
                onChange={(e) => setNewMobile(e.target.value)}
              />
            </div>
            <button
              id="btn-send-mobile-otp"
              className="btn btn-primary"
              disabled={mobileSaving || !newMobile}
              onClick={() => { setMobileErr(''); handleSendMobileOtp(newMobile); setMobileUiState('entering'); }}
              style={{ whiteSpace: "nowrap" }}
            >
              {mobileSaving ? <span className="spinner" /> : <Smartphone size={14} />}
              {mobileSaving ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        )}

        {/* State: OTP sent — verify & save new mobile */}
        {mobileUiState === 'otp_sent' || mobileUiState === 'entering' ? (
          <div>
            {mobileMsg && (
              <p style={{ fontSize: 13, color: "var(--success)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={14} /> {mobileMsg}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label className="label">Enter OTP sent to {newMobile}</label>
                <input
                  id="input-admin-mobile-otp"
                  className="input"
                  type="text"
                  maxLength={6}
                  placeholder="______"
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value)}
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: 4, fontSize: 18 }}
                />
              </div>
              <button
                id="btn-verify-set-mobile"
                className="btn btn-primary"
                disabled={mobileSaving || mobileOtp.length < 6}
                onClick={handleVerifySet}
              >
                {mobileSaving ? <span className="spinner" /> : <ShieldCheck size={14} />}
                {mobileSaving ? 'Verifying...' : 'Verify & Save'}
              </button>
              <button
                onClick={() => { setMobileUiState('idle'); setMobileOtp(''); setMobileMsg(''); setMobileErr(''); }}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)",
                  background: "var(--bg-elevated)", cursor: "pointer", fontSize: 13 }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {/* State: removing — verify OTP to remove */}
        {mobileUiState === 'removing' && (
          <div style={{ marginTop: 12 }}>
            {mobileMsg && (
              <p style={{ fontSize: 13, color: "var(--success)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={14} /> {mobileMsg}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label className="label">Enter OTP sent to {maskedMobile} to confirm removal</label>
                <input
                  id="input-remove-mobile-otp"
                  className="input"
                  type="text"
                  maxLength={6}
                  placeholder="______"
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value)}
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: 4, fontSize: 18 }}
                />
              </div>
              <button
                id="btn-confirm-remove-mobile"
                disabled={mobileSaving || mobileOtp.length < 6}
                onClick={handleVerifyRemove}
                style={{
                  padding: "10px 16px", borderRadius: 10, fontWeight: 600, fontSize: 13,
                  border: "1px solid rgba(255,59,48,0.3)", cursor: mobileSaving || mobileOtp.length < 6 ? "not-allowed" : "pointer",
                  background: "rgba(255,59,48,0.1)", color: "var(--danger)",
                  display: "flex", alignItems: "center", gap: 6, opacity: mobileSaving || mobileOtp.length < 6 ? 0.5 : 1,
                }}
              >
                {mobileSaving ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : <Trash2 size={13} />}
                {mobileSaving ? 'Removing...' : 'Confirm Remove'}
              </button>
              <button
                onClick={() => { setMobileUiState('idle'); setMobileOtp(''); setMobileMsg(''); setMobileErr(''); }}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)",
                  background: "var(--bg-elevated)", cursor: "pointer", fontSize: 13 }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {mobileErr && (
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} /> {mobileErr}
          </p>
        )}
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
            <KeyRound size={16} style={{ color: "var(--accent)" }} /> Door PIN — Admin Access
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            Generates a 30-minute admin access PIN on the smart lock.
            Only works when <strong>no customer session is running</strong> — if a session is active, the customer&apos;s PIN is protected.
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
              : <><KeyRound size={14} /> Generate Admin Access PIN</>
            }
          </button>
          {generatedPin && (
            <div style={{
              marginTop: 14, padding: "14px 18px",
              background: "rgba(201,147,58,0.08)", borderRadius: 10,
              border: "1px solid rgba(201,147,58,0.25)",
            }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>Admin Door PIN — Valid 30 min</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Enter on keypad:</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "var(--accent)", letterSpacing: 3 }}>
                  {generatedPin}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Press the PIN digits followed by # on the door keypad.</p>
            </div>
          )}
          {deviceMsg.doorPin && !generatedPin && (
            <p style={{ fontSize: 12, marginTop: 8, color: deviceStatus.doorPin === "error" ? "var(--danger)" : "var(--success)" }}>
              {deviceMsg.doorPin}
            </p>
          )}
        </div>
      </section>

      {/* Save button is inside the Pricing & Session section above */}

    </div>
  );
}
