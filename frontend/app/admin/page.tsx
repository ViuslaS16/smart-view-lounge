"use client";

import { formatLKR, formatDate, formatTime } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { useApi } from "@/lib/hooks";
import { Banknote, Clapperboard, TrendingUp, Landmark, Users, Hourglass } from "lucide-react";

export default function AdminOverviewPage() {
  const { data: dashData, isLoading: dashLoading } = useApi<any>('/admin/dashboard', 10000);
  const { data: userData, isLoading: userLoading } = useApi<any>('/admin/users', 10000);

  if ((dashLoading || userLoading) && (!dashData && !userData)) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading dashboard...</div>;
  }

  const stats = dashData?.stats || {};
  const todayBookings = dashData?.upcoming || [];
  const recentCustomers = userData?.users?.slice(0, 4) || [];
  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700 }}>Dashboard Overview</h1>
      </div>

      {/* Stat grid */}
      <div className="grid-auto" style={{ display: "grid", gap: 16, marginBottom: 32 }}>
        <StatCard
          label="Today's Revenue"
          value={formatLKR(stats.today_revenue || 0)}
          sub={`${stats.today_bookings || 0} sessions`}
          color="var(--accent)"
          icon={<Banknote size={20} />}
        />
        <StatCard
          label="Today's Bookings"
          value={String(stats.today_bookings || 0)}
          sub="Live today"
          color="var(--info)"
          icon={<Clapperboard size={20} />}
        />
        <StatCard
          label="Weekly Revenue"
          value={formatLKR(stats.weekly_revenue || 0)}
          sub="This week"
          color="var(--success)"
          icon={<TrendingUp size={20} />}
        />
        <StatCard
          label="Monthly Revenue"
          value={formatLKR(stats.monthly_revenue || 0)}
          sub="This month"
          color="var(--accent)"
          icon={<Landmark size={20} />}
        />
        <StatCard
          label="Total Customers"
          value={String(stats.total_users || 0)}
          sub="All time"
          color="var(--info)"
          icon={<Users size={20} />}
        />
        <StatCard
          label="Pending Verifications"
          value={String(stats.pending_verifications || 0)}
          sub={<Link href="/admin/verifications" style={{ color: "var(--warning)", textDecoration: "none", fontSize: 12 }}>Review NICs →</Link>}
          color="var(--warning)"
          icon={<Hourglass size={20} />}
        />
        <StatCard
          label="Pending Payments"
          value={String(stats.pending_payments || 0)}
          sub={<Link href="/admin/bookings?filter=pending" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 12 }}>Verify now →</Link>}
          color="var(--accent)"
          icon={<Landmark size={20} />}
        />
      </div>

      <div className="grid-2col" style={{ display: "grid", gap: 20 }}>
        {/* Today's bookings */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16 }}>Today&apos;s Sessions</h2>
            <Link href="/admin/bookings" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {todayBookings.length > 0 ? todayBookings.map((b: any) => (
              <div key={b.id} className="card-elevated" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{formatTime(b.start_time)} – {formatTime(b.end_time)}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 3 }}>{b.id}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--accent)" }}>{formatLKR(b.total_amount)}</p>
                  <span className={`badge badge-${b.status}`} style={{ marginTop: 4 }}>{b.status}</span>
                </div>
              </div>
            )) : (
              <div className="card-elevated" style={{ padding: "24px 16px", textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No sessions booked for today yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent customers */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16 }}>Recent Customers</h2>
            <Link href="/admin/customers" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>View all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentCustomers.length > 0 ? recentCustomers.map((c: any) => (
              <div key={c.id} className="card-elevated" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(201,147,58,0.2), rgba(168,120,40,0.1))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 14, color: "var(--accent)",
                  }}>
                    {c.full_name?.[0] || 'U'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{c.full_name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.mobile}</p>
                  </div>
                </div>
                <span className={`badge badge-${c.status === "pending_verification" ? "pending" : c.status}`}>
                  {c.status === "pending_verification" ? "Pending" : c.status}
                </span>
              </div>
            )) : (
              <div className="card-elevated" style={{ padding: "24px 16px", textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No recent customers found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions" style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/admin/verifications" className="btn btn-primary btn-sm">
          Review NICs ({stats.pending_verifications || 0})
        </Link>
        <Link href="/admin/bookings?filter=pending" className="btn btn-primary btn-sm" style={{ background: 'var(--success)', border: 'none', color: '#fff' }}>
          Verify Payments ({stats.pending_payments || 0})
        </Link>
        <Link href="/admin/bookings" className="btn btn-secondary btn-sm">
          Create Manual Booking
        </Link>
        <Link href="/admin/analytics" className="btn btn-ghost btn-sm">
          Export Revenue CSV
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }: {
  label: string;
  value: string;
  sub: React.ReactNode;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</p>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>{icon}</span>
      </div>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color, marginBottom: 6 }}>{value}</p>
      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</p>
    </div>
  );
}
