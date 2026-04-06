"use client";

import { useState } from "react";
import Link from "next/link";
import { format, addDays, isSameDay, startOfDay } from "date-fns";
import { formatDate, formatTime, isSessionActive, generateTimeSlots, formatLKR } from "@/lib/utils";
import { useApi } from "@/lib/hooks";
import { Clapperboard } from "lucide-react";

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: profile, isLoading: isProfileLoading } = useApi<any>('/users/profile');
  const { data: bookingsData, isLoading: isBookingsLoading } = useApi<{bookings: any[]}>('/users/bookings');
  
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: slotsData } = useApi<{booked_blocks: any[], buffer_minutes: number}>(`/bookings/slots?date=${selectedDateStr}`);

  const bookings = bookingsData?.bookings || [];

  // Upcoming confirmed booking
  const upcomingBooking = bookings.find(
    (b) => b.status === "confirmed" && new Date(b.start_time) > new Date()
  );

  // Active booking (in progress right now)
  const activeBooking = bookings.find(
    (b) => b.status === "confirmed" && isSessionActive(b.start_time, b.end_time)
  );

  // Generate calendar days (today + 13 days)
  const calendarDays = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i));

  // Generate time slots for selected date
  const slots = slotsData ? generateTimeSlots(selectedDate, slotsData.booked_blocks, slotsData.buffer_minutes) : [];

  if (isProfileLoading || isBookingsLoading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading dashboard...</div>;
  }

  return (
    <div className="page">
      {/* Greeting */}
      <div style={{ paddingTop: 20, marginBottom: 24 }} className="animate-fade-up">
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Good {getGreeting()}</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700 }}>
          {profile?.full_name?.split(" ")[0] || 'Guest'}
        </h1>
      </div>

      {/* Active session banner */}
      {activeBooking && (
        <Link href="/dashboard/session" style={{ textDecoration: "none", display: "block", marginBottom: 20 }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(61,184,122,0.15), rgba(61,184,122,0.05))",
            border: "1px solid rgba(61,184,122,0.3)",
            borderRadius: 16, padding: "16px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }} className="animate-pulse-gold">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--success)" }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "var(--success)", marginBottom: 2 }}>Session Active Now</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Ends at {formatTime(activeBooking.end_time)}
                </p>
              </div>
            </div>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--success)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </Link>
      )}

      {/* Upcoming booking hero card */}
      {upcomingBooking && !activeBooking && (
        <div className="card" style={{ padding: 0, marginBottom: 24, overflow: "hidden" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(201,147,58,0.18), rgba(168,120,40,0.05))",
            borderBottom: "1px solid var(--border)", padding: "20px 20px 16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 6 }}>
                  Upcoming Booking
                </p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>
                  {formatDate(upcomingBooking.start_time)}
                </p>
              </div>
              <span className="badge badge-confirmed">Confirmed</span>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>Duration</p>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{upcomingBooking.duration_minutes / 60}h session</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>Amount Paid</p>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{formatLKR(upcomingBooking.total_amount)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>Ref</p>
                <p style={{ fontWeight: 600, fontSize: 13, fontFamily: "var(--font-mono)" }}>{upcomingBooking.id}</p>
              </div>
            </div>
          </div>
          <div style={{ padding: "12px 20px", display: "flex", justifyContent: "flex-end" }}>
            <Link href="/dashboard/bookings" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
              View all bookings →
            </Link>
          </div>
        </div>
      )}

      {/* No upcoming */}
      {!upcomingBooking && !activeBooking && (
        <div style={{
          textAlign: "center", padding: "28px 20px", marginBottom: 24,
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16,
        }}>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center", color: "var(--text-muted)" }}><Clapperboard size={40} /></div>
          <p style={{ fontWeight: 600, marginBottom: 6 }}>No upcoming bookings</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Pick a time slot below to book your session</p>
        </div>
      )}

      {/* Calendar strip */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: 14 }}>
          Available Slots
        </h2>
        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
          <div style={{ display: "flex", gap: 10, width: "max-content" }}>
            {calendarDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "12px 14px", borderRadius: 12, minWidth: 56,
                    background: isSelected ? "linear-gradient(135deg, #C9933A, #A87828)" : "var(--bg-card)",
                    border: isSelected ? "none" : "1px solid var(--border-subtle)",
                    cursor: "pointer", transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: isSelected ? "#0A0A0B" : "var(--text-muted)", marginBottom: 5 }}>
                    {format(day, "EEE")}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: isSelected ? "#0A0A0B" : "var(--text-primary)" }}>
                    {format(day, "d")}
                  </span>
                  {isToday && (
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "#0A0A0B" : "var(--accent)", marginTop: 4 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected date label */}
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, fontWeight: 500 }}>
        {format(selectedDate, "EEEE, MMMM d")} · {slots.filter(s => s.available).length} slots available
      </p>

      {/* Time slot grid */}
      {slots.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 32 }}>
          {slots.map((slot) => (
            <div key={slot.time} className={`time-slot${!slot.available ? " booked" : ""}`}>
              {slot.available ? (
                <Link
                  href={`/dashboard/book?date=${format(selectedDate, "yyyy-MM-dd")}&time=${slot.time}`}
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{slot.time}</span>
                </Link>
              ) : (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{slot.time}</span>
              )}
              {!slot.available && (
                <span style={{ fontSize: 9, color: "var(--text-muted)", display: "block", marginTop: 2 }}>Booked</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border-subtle)" }}>
          <p style={{ fontSize: 14 }}>No more slots available for this date</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Try selecting a different day</p>
        </div>
      )}

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="card" style={{ padding: "16px 18px" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Your Bookings</p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
            {bookings.length}
          </p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>All time</p>
        </div>
        <div className="card" style={{ padding: "16px 18px" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Hours Watched</p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>
            {bookings.reduce((sum, b) => sum + (b.duration_minutes || 0), 0) / 60}h
          </p>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Total sessions</p>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
