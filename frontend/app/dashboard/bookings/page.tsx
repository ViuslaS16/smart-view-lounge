"use client";

import { useState } from "react";
import Link from "next/link";
import { formatLKR, formatDuration, formatDate } from "@/lib/utils";
import { useApi } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";
import { Mailbox, Check, X, Clock } from "lucide-react";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
type Booking = { id: string; start_time: string; end_time: string; duration_minutes: number; status: BookingStatus; total_amount: number; created_at: string; payhere_order_id?: string; };

const filters: { label: string; value: BookingStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function statusBadge(status: BookingStatus) {
  const map: Record<BookingStatus, string> = {
    confirmed: "badge-confirmed",
    completed: "badge-completed",
    cancelled: "badge-cancelled",
    pending: "badge-pending",
  };
  const labels: Record<BookingStatus, string> = {
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    pending: "Pending",
  };
  return <span className={`badge ${map[status]}`}>{labels[status]}</span>;
}

export default function BookingsPage() {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data, isLoading, mutate } = useApi<{bookings: Booking[]}>('/users/bookings');

  const bookings = data?.bookings ? [...data.bookings].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ) : [];

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  async function handleCancel(id: string) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancellingId(id);
    try {
      await apiFetch(`/bookings/${id}/cancel`, { method: "POST" });
      mutate();
      alert("Booking cancelled. Refund will be processed within 3–5 business days.");
    } catch (err: any) {
      alert(err.message || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="page" style={{ paddingTop: 80 }}>
      <div className="animate-fade-up">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginBottom: 20 }}>
          My Bookings
        </h1>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {filters.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              style={{
                padding: "7px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s ease", border: "none",
                background: filter === value ? "linear-gradient(135deg, #C9933A, #A87828)" : "var(--bg-card)",
                color: filter === value ? "#0A0A0B" : "var(--text-secondary)",
                boxShadow: filter === value ? "0 4px 14px rgba(201,147,58,0.3)" : "none",
                ...(filter !== value && { border: "1px solid var(--border-subtle)" }),
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Bookings list */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>Loading bookings...</div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 20px",
            background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border-subtle)",
          }}>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center", color: "var(--text-muted)" }}><Mailbox size={36} /></div>
            <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>No bookings found</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
              {filter === "all" ? "You haven't made any bookings yet." : `No ${filter} bookings.`}
            </p>
            <Link href="/dashboard" className="btn btn-primary btn-sm">Browse Available Slots</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancel}
                cancelling={cancellingId === booking.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking, onCancel, cancelling }: {
  booking: Booking;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const isUpcoming = booking.status === "confirmed" && new Date(booking.start_time) > new Date();

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "18px 18px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              {formatDate(booking.start_time)}
            </p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
              {booking.id}
            </p>
          </div>
          {statusBadge(booking.status)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>Duration</p>
            <p style={{ fontWeight: 600, fontSize: 14 }}>{formatDuration(booking.duration_minutes)}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>Amount</p>
            <p style={{ fontWeight: 600, fontSize: 14, color: "var(--accent)" }}>{formatLKR(booking.total_amount)}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>Status</p>
            <p style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
              {booking.status === "confirmed" ? <><Check size={14} /> Paid</> : booking.status === "completed" ? <><Check size={14} /> Done</> : booking.status === "pending" ? <><Clock size={14} /> Verifying...</> : <><X size={14} /> Cancelled</>}
            </p>
          </div>
        </div>
      </div>

      {isUpcoming && (
        <div style={{
          padding: "12px 18px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex", gap: 10, justifyContent: "flex-end",
        }}>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => onCancel(booking.id)}
            disabled={cancelling}
          >
            {cancelling ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : null}
            {cancelling ? "Cancelling..." : "Cancel Booking"}
          </button>
        </div>
      )}
    </div>
  );
}
