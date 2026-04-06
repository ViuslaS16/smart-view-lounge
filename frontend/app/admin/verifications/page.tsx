"use client";

import { useState } from "react";
import { useApi } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";
import { Check, X, ShieldCheck } from "lucide-react";

type ActionState = Record<string, "idle" | "approving" | "rejecting" | "done_approved" | "done_rejected">;

export default function VerificationsPage() {
  const [actions, setActions] = useState<ActionState>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<Record<string, boolean>>({});

  const { data, isLoading, mutate } = useApi<{ users: any[] }>("/admin/users?status=pending_verification", 10000);
  // Show ALL pending_verification users — even those who haven't uploaded NIC yet
  // Admin can see them and manually approve if needed
  const queue = (data?.users || []).filter(
    (u: any) => u.status === "pending_verification"
  );

  async function handleApprove(userId: string) {
    setActions((p) => ({ ...p, [userId]: "approving" }));
    try {
      await apiFetch(`/admin/users/${userId}/approve`, { method: "PATCH" });
      setActions((p) => ({ ...p, [userId]: "done_approved" }));
      setTimeout(() => mutate(), 1500);
    } catch (err: any) {
      alert(err.message || "Failed to approve");
      setActions((p) => ({ ...p, [userId]: "idle" }));
    }
  }

  async function handleReject(userId: string) {
    const reason = rejectReason[userId];
    if (!reason?.trim()) {
      setShowRejectInput((p) => ({ ...p, [userId]: true }));
      return;
    }
    setActions((p) => ({ ...p, [userId]: "rejecting" }));
    try {
      await apiFetch(`/admin/users/${userId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      setActions((p) => ({ ...p, [userId]: "done_rejected" }));
      setTimeout(() => mutate(), 1500);
    } catch (err: any) {
      alert(err.message || "Failed to reject");
      setActions((p) => ({ ...p, [userId]: "idle" }));
    }
  }

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading verifications...</div>;
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
          NIC Verifications
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Review customer identity documents before approving account access.
        </p>
      </div>

      {queue.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 32px",
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, color: "var(--success)" }}><ShieldCheck size={40} /></div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            All clear!
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            No pending NIC verifications. Check back later.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {queue.map((user: any) => {
            const state = actions[user.id] || "idle";
            const isDone = state === "done_approved" || state === "done_rejected";
            const isLoading = state === "approving" || state === "rejecting";

            return (
              <div
                key={user.id}
                className="card"
                style={{
                  padding: 0, overflow: "hidden",
                  opacity: isDone ? 0.5 : 1,
                  transition: "opacity 0.5s ease",
                }}
              >
                {/* Customer info header */}
                <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(201,147,58,0.2), rgba(168,120,40,0.1))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: 16, color: "var(--accent)", flexShrink: 0,
                      }}>
                        {user.full_name?.[0] || "?"}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 16 }}>{user.full_name}</p>
                        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{user.email}</p>
                      </div>
                    </div>
                    {isDone ? (
                      <span className={`badge ${state === "done_approved" ? "badge-confirmed" : "badge-cancelled"}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {state === "done_approved" ? (
                          <>Approved <Check size={14} /></>
                        ) : (
                          <>Rejected <X size={14} /></>
                        )}
                      </span>
                    ) : (
                      <span className="badge badge-pending">Pending Review</span>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                    <div>
                      <p className="label">Mobile</p>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{user.mobile}</p>
                    </div>
                    <div>
                      <p className="label">NIC Number</p>
                      <p style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 14 }}>{user.nic_number || "—"}</p>
                    </div>
                    <div>
                      <p className="label">Submitted</p>
                      <p style={{ fontWeight: 500, fontSize: 13 }}>
                        {new Date(user.updated_at || user.created_at).toLocaleDateString("en-LK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* NIC images preview */}
                <div style={{ padding: "16px 20px", background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <p className="label" style={{ marginBottom: 10 }}>NIC Images</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{
                      height: 160, borderRadius: 10, overflow: "hidden",
                      background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                      display: "flex", alignItems: "center", justifyContent: "center", position: "relative"
                    }}>
                      <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 4, zIndex: 1 }}>FRONT</div>
                      {user.nic_front_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.nic_front_url} alt="NIC Front" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ textAlign: "center", color: "var(--text-muted)" }}>Missing</div>
                      )}
                    </div>
                    <div style={{
                      height: 160, borderRadius: 10, overflow: "hidden",
                      background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                      display: "flex", alignItems: "center", justifyContent: "center", position: "relative"
                    }}>
                      <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 4, zIndex: 1 }}>BACK</div>
                      {user.nic_back_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.nic_back_url} alt="NIC Back" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ textAlign: "center", color: "var(--text-muted)" }}>Missing</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reject reason input */}
                {showRejectInput[user.id] && !isDone && (
                  <div style={{ padding: "12px 20px", background: "rgba(226,75,74,0.05)", borderBottom: "1px solid var(--border-subtle)" }}>
                    <label className="label">Rejection Reason (required)</label>
                    <input
                      className="input"
                      placeholder="e.g., Blurry image, NIC number mismatch..."
                      value={rejectReason[user.id] || ""}
                      onChange={(e) => setRejectReason((p) => ({ ...p, [user.id]: e.target.value }))}
                    />
                  </div>
                )}

                {/* Actions */}
                {!isDone && (
                  <div style={{ padding: "14px 20px", display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleReject(user.id)}
                      disabled={isLoading}
                    >
                      {state === "rejecting" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : null}
                      {state === "rejecting" ? "Rejecting..." : (showRejectInput[user.id] ? "Confirm Reject" : "Reject")}
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleApprove(user.id)}
                      disabled={isLoading}
                    >
                      {state === "approving" ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : null}
                      {state === "approving" ? "Approving..." : "Approve Account"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
