"use client";

import { useState } from "react";
import { formatLKR } from "@/lib/utils";
import { useApi } from "@/lib/hooks";
import { apiFetch } from "@/lib/api";
import { X, Search } from "lucide-react";

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data, isLoading, mutate } = useApi<{ users: any[] }>("/admin/users", 10000);
  const customers = data?.users || [];

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.mobile?.includes(q) ||
      c.nic_number?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const statusColors: Record<string, string> = {
    active: "badge-active",
    pending_verification: "badge-pending",
    suspended: "badge-suspended",
  };
  const statusLabels: Record<string, string> = {
    active: "Active",
    pending_verification: "Pending",
    suspended: "Suspended",
  };

  async function handleSuspend(id: string, name: string) {
    if (!confirm(`Suspend ${name}'s account?`)) return;
    try {
      await apiFetch(`/admin/users/${id}/suspend`, { method: "PATCH" });
      mutate();
      setSelectedCustomer(null);
    } catch (err: any) {
      alert(err.message || "Failed to suspend user");
    }
  }

  async function handleApprove(id: string) {
    try {
      await apiFetch(`/admin/users/${id}/approve`, { method: "PATCH" });
      mutate();
      setSelectedCustomer((prev: any) => prev ? { ...prev, status: "active" } : null);
    } catch (err: any) {
      alert(err.message || "Failed to approve user");
    }
  }

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading customers...</div>;
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
          Customers
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Search by name, mobile number, or NIC number.
        </p>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: 24, maxWidth: 440 }}>
        <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          className="input"
          placeholder="Search by name, mobile, NIC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 42 }}
        />
      </div>

      {/* Table */}
      <div className="table-wrap" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Mobile</th>
              <th>NIC Number</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                  {search ? "No customers match your search." : "No customers yet."}
                </td>
              </tr>
            ) : (
              filtered.map((customer: any) => (
                <tr key={customer.id} style={{ cursor: "pointer" }} onClick={() => setSelectedCustomer(customer)}>
                  <td>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: "linear-gradient(135deg, rgba(201,147,58,0.2), rgba(168,120,40,0.1))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: 13, color: "var(--accent)", flexShrink: 0,
                      }}>
                        {customer.full_name?.[0] || "?"}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14 }}>{customer.full_name}</p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{customer.mobile}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{customer.nic_number || "—"}</td>
                  <td>
                    <span className={`badge ${statusColors[customer.status] || "badge-pending"}`}>
                      {statusLabels[customer.status] || customer.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {new Date(customer.created_at).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
        {filtered.length} of {customers.length} customers
      </p>

      {/* Customer detail drawer */}
      {selectedCustomer && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
          display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
        }} onClick={() => setSelectedCustomer(null)}>
          <div style={{
            width: 380, height: "100dvh", background: "var(--bg-card)",
            borderLeft: "1px solid var(--border)", overflowY: "auto",
            padding: 28, animation: "fadeUp 0.25s ease",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>Customer Profile</h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex", alignItems: "center" }}
              ><X size={20} /></button>
            </div>

            {/* Avatar */}
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(201,147,58,0.25), rgba(168,120,40,0.15))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 20, color: "var(--accent)",
              }}>
                {selectedCustomer.full_name?.[0] || "?"}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 18 }}>{selectedCustomer.full_name}</p>
                <span className={`badge ${statusColors[selectedCustomer.status] || "badge-pending"}`}>
                  {statusLabels[selectedCustomer.status] || selectedCustomer.status}
                </span>
              </div>
            </div>

            {/* Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Email", value: selectedCustomer.email },
                { label: "Mobile", value: selectedCustomer.mobile, mono: true },
                { label: "NIC Number", value: selectedCustomer.nic_number || "Not provided", mono: true },
                { label: "Customer ID", value: selectedCustomer.id, mono: true },
                { label: "Joined", value: new Date(selectedCustomer.created_at).toLocaleDateString("en-LK", { day: "numeric", month: "long", year: "numeric" }) },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <p className="label">{label}</p>
                  <p style={{ fontFamily: mono ? "var(--font-mono)" : undefined, fontSize: 14, fontWeight: mono ? 600 : 500, wordBreak: "break-all" }}>{value}</p>
                </div>
              ))}
            </div>

            <div className="divider" />

            {/* Actions */}
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedCustomer.status === "pending_verification" && (
                <button className="btn btn-primary btn-sm btn-full"
                  onClick={() => handleApprove(selectedCustomer.id)}>
                  Approve Account
                </button>
              )}
              {selectedCustomer.status === "active" && (
                <button className="btn btn-danger btn-sm btn-full"
                  onClick={() => handleSuspend(selectedCustomer.id, selectedCustomer.full_name)}>
                  Suspend Account
                </button>
              )}
              {selectedCustomer.status === "suspended" && (
                <button className="btn btn-secondary btn-sm btn-full"
                  onClick={() => handleApprove(selectedCustomer.id)}>
                  Reactivate Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
