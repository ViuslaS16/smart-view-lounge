"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { format, parse } from "date-fns";
import { formatLKR } from "@/lib/utils";
import { Check, Clapperboard, Smartphone, Mail } from "lucide-react";

function SuccessContent() {
  const params = useSearchParams();
  const ref = params.get("ref") || "BKG-2025-009";
  const amount = parseFloat(params.get("amount") || "2500");
  const dateStr = params.get("date") || format(new Date(), "yyyy-MM-dd");
  const timeStr = params.get("time") || "10:00";
  const durationMins = parseInt(params.get("duration") || "60");
  const status = params.get("status");

  const isVerifying = status === "verifying";

  const startDate = parse(dateStr, "yyyy-MM-dd", new Date());
  const endDate = new Date(startDate);
  endDate.setHours(parseInt(timeStr.split(":")[0]), parseInt(timeStr.split(":")[1]) + durationMins, 0, 0);

  return (
    <div className="page-center" style={{ padding: "24px 20px 120px" }}>
      <div className="animate-fade-up" style={{ width: "100%" }}>
        {/* Success icon */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: isVerifying ? "rgba(201,147,58,0.12)" : "rgba(61,184,122,0.12)", 
            border: `2px solid ${isVerifying ? "rgba(201,147,58,0.35)" : "rgba(61,184,122,0.35)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", color: isVerifying ? "var(--accent)" : "var(--success)"
          }}>
            {isVerifying ? <Smartphone size={32} /> : <Check size={36} />}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
            {isVerifying ? "Receipt Submitted!" : "Booking Confirmed!"}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
            {isVerifying ? (
              <>We are reviewing your payment to verify the transaction.<br />You'll receive an SMS as soon as it is approved.</>
            ) : (
              <>Your private screening session is booked.<br />We&apos;ll SMS you 15 minutes before it starts.</>
            )}
          </p>
        </div>

        {/* Receipt card */}
        <div className="receipt-card" style={{ marginBottom: 24 }}>
          <div className="receipt-header">
            <div style={{ marginBottom: 10, display: "flex", justifyContent: "center", color: "var(--accent)" }}><Clapperboard size={32} /></div>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
              SmartView Lounge
            </p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Private Theater Session</p>
          </div>

          <div style={{ padding: "4px 20px 20px" }}>
            <div className="receipt-row">
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Booking Reference</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{ref}</span>
            </div>
            <div className="receipt-row">
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Date</span>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{format(startDate, "EEE, MMM d, yyyy")}</span>
            </div>
            <div className="receipt-row">
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Start Time</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{timeStr}</span>
            </div>
            <div className="receipt-row">
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>End Time</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{format(endDate, "HH:mm")}</span>
            </div>
            <div className="receipt-row">
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Duration</span>
              <span style={{ fontWeight: 600 }}>{durationMins >= 60 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60 > 0 ? `${durationMins % 60}m` : ""}`.trim() : `${durationMins}m`}</span>
            </div>
            <div className="receipt-row" style={{ borderBottom: "none", paddingTop: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Amount Paid</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }} className="text-gold">
                {formatLKR(amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Reminders */}
        {isVerifying ? (
          <div className="alert alert-info" style={{ marginBottom: 28, fontSize: 13 }}>
            <span style={{ display: "flex", alignItems: "center" }}><Smartphone size={16} /></span>
            <div>Once verified, your door PIN and confirmation will be sent to via SMS.</div>
          </div>
        ) : (
          <>
            <div className="alert alert-success" style={{ marginBottom: 16, fontSize: 13 }}>
              <span style={{ display: "flex", alignItems: "center" }}><Smartphone size={16} /></span>
              <div>You&apos;ll receive an SMS reminder <strong>15 minutes before</strong> your session starts.</div>
            </div>
            <div className="alert alert-info" style={{ marginBottom: 28, fontSize: 13 }}>
              <span style={{ display: "flex", alignItems: "center" }}><Mail size={16} /></span>
              <div>A payment receipt has been sent to your email address.</div>
            </div>
          </>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/dashboard/bookings" className="btn btn-primary btn-full">
            View My Bookings
          </Link>
          <Link href="/dashboard" className="btn btn-ghost btn-full">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
