"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatLKR, formatDate, formatTime, isSessionActive } from "@/lib/utils";
import { useApi } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";
import { AlertTriangle, Check } from "lucide-react";

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  progress: number; // 0–100
}

export default function SessionPage() {
  const { data, isLoading } = useApi<{bookings: any[]}>('/users/bookings');

  // Active booking (in progress right now)
  const booking = data?.bookings?.find(
    (b) => b.status === "confirmed" && isSessionActive(b.start_time, b.end_time)
  );

  const totalDurationMs = booking ? booking.duration_minutes * 60 * 1000 : 0;

  const calcTimeLeft = useCallback((): TimeLeft => {
    if (!booking) return { hours: 0, minutes: 0, seconds: 0, totalMs: 0, progress: 0 };
    const now = Date.now();
    const end = new Date(booking.end_time).getTime();
    const start = new Date(booking.start_time).getTime();
    const remaining = Math.max(0, end - now);
    const elapsed = now - start;
    const progress = Math.min(100, Math.max(0, (elapsed / totalDurationMs) * 100));
    return {
      hours: Math.floor(remaining / (1000 * 60 * 60)),
      minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((remaining % (1000 * 60)) / 1000),
      totalMs: remaining,
      progress,
    };
  }, [booking?.end_time, booking?.start_time, totalDurationMs]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft());
  const [showExtend, setShowExtend] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendDone, setExtendDone] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, [calcTimeLeft]);

  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (timeLeft.progress / 100) * circumference;

  const isWarning = timeLeft.minutes < 15 && timeLeft.hours === 0;
  const accentColor = isWarning ? "var(--warning)" : "var(--success)";

  async function handleExtend() {
    if (!booking) return;
    setExtending(true);
    try {
      await apiFetch(`/bookings/${booking.id}/extend`, {
        method: "POST",
        body: JSON.stringify({ additional_minutes: 30 })
      });
      setExtendDone(true);
      setShowExtend(false);
    } catch (err: any) {
      alert(err.message || 'Failed to check extension');
    } finally {
      setExtending(false);
    }
  }



  if (isLoading) {
    return <div style={{ padding: 80, textAlign: "center" }}>Loading session...</div>;
  }

  if (!booking) {
    return (
      <div className="page" style={{ paddingTop: 80 }}>
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <h2>No Active Session</h2>
          <p style={{ marginTop: 12 }}>You do not currently have a session in progress.</p>
          <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 24, display: "inline-block" }}>Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingTop: 80 }}>
      <div className="animate-fade-up">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
          Session Active
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>
          {formatDate(booking.start_time)} — {formatTime(booking.end_time)}
        </p>

        {/* Countdown ring */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
          <div style={{ position: "relative", width: 220, height: 220 }}>
            <svg width={220} height={220} style={{ transform: "rotate(-90deg)" }}>
              {/* Track */}
              <circle
                cx={110} cy={110} r={radius}
                fill="none" stroke="var(--bg-elevated)" strokeWidth={8}
              />
              {/* Progress */}
              <circle
                cx={110} cy={110} r={radius}
                fill="none"
                stroke={accentColor}
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
              />
            </svg>
            {/* Center content */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              {timeLeft.totalMs === 0 ? (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "var(--danger)" }}>Session Ended</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Theater shutting down</p>
                </div>
              ) : (
                <>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 40, fontWeight: 700, color: accentColor, lineHeight: 1 }}>
                    {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}
                  </p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: accentColor, opacity: 0.7 }}>
                    :{String(timeLeft.seconds).padStart(2, "0")}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>remaining</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Warning */}
        {isWarning && timeLeft.totalMs > 0 && (
          <div className="alert alert-warning animate-fade-up" style={{ marginBottom: 20 }}>
            <span style={{ display: "flex", alignItems: "center" }}><AlertTriangle size={18} /></span>
            <div>
              <strong>Session ending soon!</strong><br />
              <span style={{ fontSize: 13 }}>Less than 15 minutes remaining. Extend if you need more time.</span>
            </div>
          </div>
        )}

        {/* Session details */}
        <div className="card" style={{ padding: "18px", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <p className="label">Start Time</p>
              <p style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatTime(booking.start_time)}</p>
            </div>
            <div>
              <p className="label">End Time</p>
              <p style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatTime(booking.end_time)}</p>
            </div>
            <div>
              <p className="label">Duration</p>
              <p style={{ fontWeight: 600 }}>{booking.duration_minutes / 60}h session</p>
            </div>
            <div>
              <p className="label">Amount Paid</p>
              <p style={{ fontWeight: 600, color: "var(--accent)" }}>{formatLKR(booking.total_amount)}</p>
            </div>
          </div>
        </div>

        {/* Booking ref */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: 12, marginBottom: 28,
        }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Booking Ref</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
            {booking.id}
          </span>
        </div>

        {/* Extension success */}
        {extendDone && (
          <div className="alert alert-success animate-fade-up" style={{ marginBottom: 20 }}>
            <span style={{ display: "flex", alignItems: "center" }}><Check size={18} /></span>
            <div>Your session has been extended by 30 minutes! New end time updated.</div>
          </div>
        )}



        {/* Extend flow */}
        {!showExtend ? (
          <button
            className="btn btn-secondary btn-full btn-lg"
            onClick={() => setShowExtend(true)}
            disabled={timeLeft.totalMs === 0}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add More Time
          </button>
        ) : (
          <div className="card animate-fade-up" style={{ padding: "20px" }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Extend Your Session</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 18 }}>
              Checking availability for the next slot... Next slot is <strong style={{ color: "var(--success)", display: "inline-flex", alignItems: "center", gap: 4 }}>available <Check size={14} /></strong>
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, padding: "12px 16px", background: "var(--bg-subtle)", borderRadius: 10 }}>
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>+30 minutes extension</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
                {formatLKR(1250)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowExtend(false)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleExtend} disabled={extending} style={{ flex: 2 }}>
                {extending ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : null}
                {extending ? "Processing..." : "Pay & Extend"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
