"use client";

import { useState, useEffect } from "react";
import { formatLKR, formatDate, formatTime } from "@/lib/utils";
import { format } from "date-fns";
import { useApi } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";

type Filter = "all" | "confirmed" | "completed" | "cancelled" | "pending";

const filters: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Pending Payments", value: "pending" },
];

export default function AdminBookingsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formTime, setFormTime] = useState("10:00");
  const [formDuration, setFormDuration] = useState("60");
  const [formUser, setFormUser] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, revalidate } = useApi<{ bookings: any[] }>("/admin/bookings", 10000);
  const { data: usersData } = useApi<{ users: any[] }>("/admin/users", 10000);
  const { data: settingsData } = useApi<{ settings: Record<string, string> }>("/admin/settings", 60000);

  const settings = settingsData?.settings || {};
  const hourlyRate = Number(settings.price_per_hour) || 2500;
  const timeIncrementMinutes = Number(settings.time_increment_minutes) || 30;
  const timeIncrementPrice = Number(settings.time_increment_price) || 1250;
  const minDurationMinutes = Number(settings.min_duration_minutes) || 60;

  const durationOptions = [];
  for (let i = 0; i < 5; i++) {
    const mins = minDurationMinutes + (i * timeIncrementMinutes);
    const price = hourlyRate + (i * timeIncrementPrice);
    const hoursStr = mins % 60 === 0 ? `${mins/60} hour${mins===60?'':'s'}` : `${mins/60} hours`;
    durationOptions.push({ value: mins, label: `${hoursStr} — ${formatLKR(price)}` });
  }

  useEffect(() => {
    if (minDurationMinutes && formDuration === "60" && minDurationMinutes !== 60) {
      setFormDuration(String(minDurationMinutes));
    }
  }, [minDurationMinutes, formDuration]);

  const ALL_ADMIN_BOOKINGS = data?.bookings || [];
  const ALL_CUSTOMERS = usersData?.users || [];

  const filtered = ALL_ADMIN_BOOKINGS
    .filter((b: any) => {
      if (filter === "all") return b.status !== "pending" || b.payment_status === "pending_verification";
      if (filter === "pending") return b.payment_status === "pending_verification";
      return b.status === filter;
    })
    .filter((b: any) => search === "" || b.id.toLowerCase().includes(search.toLowerCase()) || (b.full_name && b.full_name.toLowerCase().includes(search.toLowerCase())));

  const sortedBookings = [...filtered].sort(
    (a: any, b: any) => new Date(b.created_at || b.start_time).getTime() - new Date(a.created_at || a.start_time).getTime()
  );

  const [viewingReceipt, setViewingReceipt] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleVerifyPayment(id: string, action: 'approve' | 'reject') {
    if (action === 'reject' && !rejectReason) {
      alert("Please provide a reason for rejection");
      return;
    }
    
    setIsVerifying(true);
    try {
      await apiFetch(`/admin/bookings/${id}/verify-payment`, {
        method: "POST",
        body: JSON.stringify({ action, reason: rejectReason })
      });
      setViewingReceipt(null);
      setRejectReason("");
      revalidate();
    } catch (err: any) {
      alert(err.message || "Action failed");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm(`Cancel booking ${id}? Refund will be processed.`)) return;
    try {
      await apiFetch(`/admin/bookings/${id}/cancel`, { method: "PATCH" });
      revalidate();
    } catch (err: any) {
      alert(err.message || "Failed to cancel booking");
    }
  }

  async function handleCreate() {
    setIsSubmitting(true);
    try {
      const startDate = new Date(`${formDate}T${formTime}:00`);
      
      await apiFetch('/admin/bookings', {
        method: "POST",
        body: JSON.stringify({
          user_id: formUser,
          start_time: startDate.toISOString(),
          duration_minutes: Number(formDuration)
        })
      });
      setShowCreateModal(false);
      revalidate();
    } catch (err: any) {
      alert(err.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading bookings...</div>;
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
            Bookings
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Manage all bookings, handle cancellations and refunds.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          + Create Booking
        </button>
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Search by booking reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filters.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              style={{
                padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s ease", border: "none",
                background: filter === value ? "linear-gradient(135deg, #C9933A, #A87828)" : "var(--bg-card)",
                color: filter === value ? "#0A0A0B" : "var(--text-secondary)",
                ...(filter !== value && { border: "1px solid var(--border-subtle)" }),
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Customer</th>
              <th>Date & Time</th>
              <th>Duration</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedBookings.map((booking: any) => {
              const isUpcoming = booking.status === "confirmed" && new Date(booking.start_time) > new Date();
              return (
                <tr key={booking.id}>
                  <td>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)" }}>
                      {booking.id}
                    </span>
                  </td>
                  <td>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{booking.full_name || "Unknown"}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{booking.mobile}</p>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{format(new Date(booking.start_time), "MMM d, yyyy")}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                      </p>
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{booking.duration_minutes / 60}h</td>
                  <td style={{ fontWeight: 700, color: "var(--accent)" }}>{formatLKR(booking.total_amount)}</td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        <span className={`badge badge-${booking.status}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                        {booking.payment_status === 'pending_verification' && (
                            <span className="badge badge-pending">
                                Unverified
                            </span>
                        )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                        {booking.payment_status === 'pending_verification' && (
                            <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => setViewingReceipt(booking)}
                            >
                                Verify
                            </button>
                        )}
                        {isUpcoming && (
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleCancel(booking.id)}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 14, fontSize: 13, color: "var(--text-muted)" }}>
        Showing {sortedBookings.length} of {ALL_ADMIN_BOOKINGS.length} bookings
      </p>

      {/* Create booking modal */}
      {showCreateModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }} onClick={() => setShowCreateModal(false)}>
          <div className="card" style={{ padding: 28, maxWidth: 440, width: "100%" }}
            onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
              Create Manual Booking
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 }}>
              Create an offline booking for walk-in or phone bookings.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="label">Customer</label>
                <select className="input" style={{ background: "var(--bg-elevated)" }} value={formUser} onChange={e => setFormUser(e.target.value)}>
                  <option value="" disabled>Select customer...</option>
                  {ALL_CUSTOMERS.filter((c: any) => c.status === "active").map((c: any) => (
                    <option key={c.id} value={c.id}>{c.full_name} — {c.mobile}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={formDate} onChange={e => setFormDate(e.target.value)} />
                </div>
                <div>
                  <label className="label">Start Time</label>
                  <input type="time" className="input" value={formTime} onChange={e => setFormTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Duration (minutes)</label>
                <select className="input" style={{ background: "var(--bg-elevated)" }} value={formDuration} onChange={e => setFormDuration(e.target.value)}>
                  {durationOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" style={{ flex: 2 }} onClick={handleCreate} disabled={!formUser || isSubmitting}>
                {isSubmitting ? "Processing..." : "Create Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Verification Modal */}
      {viewingReceipt && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "12px",
        }} onClick={() => setViewingReceipt(null)}>
          <div className="card" style={{ padding: "16px", maxWidth: 500, width: "100%", maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 }}>
                Verify Payment
                </h2>
                <button onClick={() => setViewingReceipt(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>✕</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                  <img 
                      src={viewingReceipt.receipt_url} 
                      alt="Payment Receipt" 
                      style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid var(--border)' }} 
                  />
              </div>

              <div className="card-elevated" style={{ padding: 12, marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                          <p className="label">Amount</p>
                          <p style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16 }}>{formatLKR(viewingReceipt.total_amount)}</p>
                      </div>
                      <div>
                          <p className="label">Customer</p>
                          <p style={{ fontSize: 13, wordBreak: 'break-word' }}>{viewingReceipt.full_name}</p>
                      </div>
                  </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                  <label className="label">Rejection Reason</label>
                  <textarea 
                      className="input" 
                      style={{ minHeight: 60, resize: 'none', fontSize: 13 }}
                      placeholder="e.g. Invalid receipt (Required to reject)"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                  />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 'auto' }}>
                <button 
                  className="btn btn-danger btn-sm" 
                  style={{ flex: "1 1 calc(50% - 4px)", minWidth: "120px", padding: "10px 0" }} 
                  onClick={() => handleVerifyPayment(viewingReceipt.id, 'reject')}
                  disabled={isVerifying}
                >
                  Reject
                </button>
                <button 
                  className="btn btn-primary btn-sm" 
                  style={{ flex: "1 1 calc(50% - 4px)", minWidth: "120px", padding: "10px 0" }} 
                  onClick={() => handleVerifyPayment(viewingReceipt.id, 'approve')}
                  disabled={isVerifying}
                >
                  {isVerifying ? <span className="spinner" /> : "Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
