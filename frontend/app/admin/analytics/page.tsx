"use client";

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useApi } from "@/lib/hooks";
import { formatLKR } from "@/lib/utils";
import { format } from "date-fns";

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; color: string; name: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "var(--bg-elevated)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "10px 14px", fontSize: 13,
      }}>
        <p style={{ color: "var(--text-muted)", marginBottom: 6 }}>{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color, fontWeight: 700 }}>
            {entry.name === "revenue" ? formatLKR(entry.value) : `${entry.value} bookings`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminAnalyticsPage() {
  const { data: analyticsData, isLoading: analyticsLoading } = useApi<{ chart: any[] }>("/admin/analytics");
  const { data: dashData, isLoading: dashLoading } = useApi<{ stats: any; upcoming: any[] }>("/admin/dashboard");

  const chartRows = analyticsData?.chart || [];
  const stats = dashData?.stats || {};

  // Format for recharts — use date as label, revenue and count as values
  const revenueChartData = chartRows.map((r: any) => ({
    date: format(new Date(r.date), "MMM d"),
    revenue: parseFloat(r.revenue),
    bookings: parseInt(r.count),
  }));

  if (analyticsLoading || dashLoading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading analytics...</div>;
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
          Revenue &amp; Analytics
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Financial overview and session analytics — last 30 days.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid-4col" style={{ display: "grid", gap: 16, marginBottom: 36 }}>
        {[
          { label: "Today", value: formatLKR(stats.today_revenue || 0), sub: `${stats.today_bookings || 0} sessions` },
          { label: "This Week", value: formatLKR(stats.weekly_revenue || 0), sub: "Current week" },
          { label: "This Month", value: formatLKR(stats.monthly_revenue || 0), sub: format(new Date(), "MMMM yyyy") },
          { label: "Customers", value: `${stats.total_users || 0}`, sub: "All time" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="stat-card">
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>{label}</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>{value}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card" style={{ padding: "24px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Daily Revenue</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Last 30 days · LKR</p>
          </div>
        </div>
        {revenueChartData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)", fontSize: 14 }}>
            No booking data yet. Revenue will appear here once bookings are completed.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueChartData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date" tick={{ fill: "#5A5050", fontSize: 12 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: "#5A5050", fontSize: 12 }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(201,147,58,0.06)" }} />
              <Bar dataKey="revenue" fill="url(#goldGradient)" radius={[6, 6, 0, 0]} name="revenue" />
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9933A" />
                  <stop offset="100%" stopColor="#A87828" stopOpacity={0.7} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bookings chart */}
      <div className="card" style={{ padding: "24px", marginBottom: 28 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Daily Bookings</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Number of sessions per day · Last 30 days</p>
        </div>
        {revenueChartData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 24px", color: "var(--text-muted)", fontSize: 14 }}>
            No booking data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#5A5050", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#5A5050", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="bookings" name="bookings"
                stroke="#C9933A" strokeWidth={2.5}
                dot={{ fill: "#C9933A", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: "#E0AA55" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
