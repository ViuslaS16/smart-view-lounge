"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, parse } from "date-fns";
import { formatLKR, formatDuration } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const HOURLY_RATE = 2500;
const MIN_DURATION_MINUTES = 60;
const TIME_INCREMENT_MINUTES = 30;

function calculatePrice(minutes: number) {
  return (minutes / 60) * HOURLY_RATE;
}
import { Suspense } from "react";

function BookingForm() {
  const params = useSearchParams();
  const router = useRouter();

  const dateStr = params.get("date") || format(new Date(), "yyyy-MM-dd");
  const timeStr = params.get("time") || "10:00";

  const selectedDate = parse(dateStr, "yyyy-MM-dd", new Date());
  const [duration, setDuration] = useState(MIN_DURATION_MINUTES); // minutes
  const [loading, setLoading] = useState(false);

  const price = calculatePrice(duration);
  const startHour = parseInt(timeStr.split(":")[0]);
  const startMin = parseInt(timeStr.split(":")[1]);
  const endDate = new Date(selectedDate);
  endDate.setHours(startHour, startMin + duration, 0, 0);

  const steps = [];
  for (let d = MIN_DURATION_MINUTES; d <= 240; d += TIME_INCREMENT_MINUTES) {
    steps.push(d);
  }

  async function handleBook() {
    setLoading(true);

    const startDate = new Date(selectedDate);
    startDate.setHours(startHour, startMin, 0, 0);

    try {
      // Step 1: Create the booking (status = 'pending')
      const res = await apiFetch('/bookings/create', {
        method: 'POST',
        body: JSON.stringify({
          start_time: startDate.toISOString(),
          duration_minutes: duration
        })
      }) as { booking: { id: string } };

      const bookingId = res.booking.id;

      // ── TEST MODE ─────────────────────────────────────────────────────────
      // Step 2: Directly confirm the booking — bypasses PayHere.
      //         This triggers: door PIN generation → SMS to customer
      //                        + Tuya scene will auto-start 5 min before session
      //
      // TODO: When PayHere is ready, replace this block with:
      //   const payRes = await apiFetch('/payments/initiate', { method: 'POST', body: JSON.stringify({ booking_id: bookingId }) })
      //   Then redirect user to PayHere checkout with payRes.payload
      // ─────────────────────────────────────────────────────────────────────
      await apiFetch(`/bookings/${bookingId}/confirm-test`, { method: 'POST' });

      // Redirect to success page
      router.push(
        `/dashboard/book/success?ref=${bookingId}&amount=${price}&date=${dateStr}&time=${timeStr}&duration=${duration}`
      );
    } catch (err: any) {
      alert(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ paddingTop: 80 }}>
      <div className="animate-fade-up">
        {/* Header */}
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", marginBottom: 24, padding: 0, fontSize: 14 }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
          Book Your Session
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 28 }}>
          {format(selectedDate, "EEEE, MMMM d, yyyy")} · Starts at {timeStr}
        </p>

        {/* Session details card */}
        <div className="card" style={{ padding: "20px", marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div>
              <p className="label">Date</p>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{format(selectedDate, "MMM d, yyyy")}</p>
            </div>
            <div>
              <p className="label">Start Time</p>
              <p style={{ fontWeight: 600, fontSize: 15, fontFamily: "var(--font-mono)" }}>{timeStr}</p>
            </div>
            <div>
              <p className="label">End Time</p>
              <p style={{ fontWeight: 600, fontSize: 15, fontFamily: "var(--font-mono)" }}>
                {format(endDate, "HH:mm")}
              </p>
            </div>
            <div>
              <p className="label">Rate</p>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{formatLKR(HOURLY_RATE)}/hr</p>
            </div>
          </div>
        </div>

        {/* Duration selector */}
        <div style={{ marginBottom: 28 }}>
          <label className="label" style={{ marginBottom: 14 }}>Select Duration</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {steps.map((mins) => (
              <button
                key={mins}
                onClick={() => setDuration(mins)}
                style={{
                  padding: "12px 8px", borderRadius: 12, cursor: "pointer", border: "none",
                  background: duration === mins ? "linear-gradient(135deg, #C9933A, #A87828)" : "var(--bg-card)",
                  borderWidth: duration === mins ? 0 : 1, borderStyle: "solid", borderColor: "var(--border-subtle)",
                  color: duration === mins ? "#0A0A0B" : "var(--text-secondary)",
                  fontWeight: 700, fontSize: 13, transition: "all 0.15s ease",
                }}
              >
                {formatDuration(mins)}
              </button>
            ))}
          </div>
        </div>

        {/* Order summary */}
        <div className="receipt-card" style={{ marginBottom: 28 }}>
          <div className="receipt-header">
            <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Order Summary</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Review before payment</p>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div className="receipt-row">
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Duration</span>
              <span style={{ fontWeight: 600 }}>{formatDuration(duration)}</span>
            </div>
            <div className="receipt-row">
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Rate</span>
              <span style={{ fontWeight: 600 }}>{formatLKR(HOURLY_RATE)}/hr</span>
            </div>
            <div className="receipt-row" style={{ padding: "16px 0 0", borderBottom: "none" }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }} className="text-gold">
                {formatLKR(price)}
              </span>
            </div>
          </div>
        </div>

        {/* TEST MODE notice — replace with PayHere notice when ready */}
        <div style={{
          background: 'rgba(201,147,58,0.1)',
          border: '1px solid rgba(201,147,58,0.3)',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: 13,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: 16 }}>🧪</span>
          <div>
            <strong style={{ color: 'var(--text-gold)' }}>Test Mode</strong>
            {' '}— Booking will be confirmed instantly.
            SMS with door PIN + device automation will trigger automatically.
            {' '}<span style={{ color: 'var(--text-muted)' }}>(PayHere payment will be added later)</span>
          </div>
        </div>

        <button
          id="btn-confirm-booking"
          onClick={handleBook}
          className="btn btn-primary btn-full btn-lg"
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : null}
          {loading ? 'Confirming & sending PIN...' : `Confirm Booking — ${formatLKR(price)}`}
        </button>

        <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
          You will receive a door PIN via SMS after confirmation
        </p>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense>
      <BookingForm />
    </Suspense>
  );
}
