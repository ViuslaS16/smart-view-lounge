"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function ReturnPolicyPage() {
  return (
    <div style={{ background: "var(--bg-root)", color: "var(--text-primary)", fontFamily: "var(--font-sans)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ─── Navbar ─── */}
      <nav style={{
        padding: "16px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(10,10,11,0.7)", backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(201,147,58,0.08)",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}>
          <Image src="/logo.png" alt="SmartView Lounge" width={44} height={44} style={{ borderRadius: 10, objectFit: "cover" }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>
            SmartView Lounge
          </span>
        </Link>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link href="/login" style={{
            padding: "9px 22px", borderRadius: 10, fontSize: 14, fontWeight: 500,
            color: "var(--text-secondary)", textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.06)",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(201,147,58,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* ─── Content ─── */}
      <main style={{ flex: 1, padding: "80px 48px", maxWidth: 800, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 5vw, 48px)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 40, color: "#C9933A" }}>
          Return & Refund Policy
        </h1>
        
        <div style={{ fontSize: 16, lineHeight: 1.8, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 24 }}>
          <p>Last updated: April 2026</p>
          
          <p>Thank you for choosing SmartView Lounge for your private cinematic experience. We strive to provide the best service and flexibility for our guests.</p>
          
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>1. Cancellation and Refunds</h2>
          <p>Since our facility operates on an automated booking system, time slots are strictly reserved. Our cancellation guidelines are as follows:</p>
          <ul style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <li><strong>More than 24 hours notice:</strong> Cancellations made at least 24 hours prior to the scheduled booking time will be eligible for a full refund or equivalent system credit.</li>
            <li><strong>Less than 24 hours notice:</strong> We do not offer refunds for cancellations made within 24 hours of the scheduled start time.</li>
            <li><strong>No-Shows:</strong> Failure to arrive for your booking will result in the forfeiture of the entire booking fee. No refunds will be provided for no-shows.</li>
          </ul>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>2. Late Arrivals</h2>
          <p>Your access code is active strictly for the duration of your booked time slot. If you arrive late, your session will still end at the originally scheduled time. We do not offer refunds or time extensions for late arrivals.</p>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>3. Technical Issues</h2>
          <p>In the rare event of a technical failure on our end (e.g., equipment malfunction, power outage not resolved by backup systems) that significantly impacts your experience, a full or partial refund will be provided at the discretion of SmartView Lounge management.</p>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>4. Process for Refunds</h2>
          <p>To request a refund, please contact us with your booking reference. Approved refunds will be processed to the original method of payment within 5-7 business days.</p>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer style={{
        padding: "28px 48px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <span style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 15,
          color: "var(--text-primary)",
          letterSpacing: "-0.2px",
        }}>
          SmartView Lounge
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            © 2026 SmartView Lounge
          </span>
          <span style={{ fontSize: 13, color: "var(--text-muted)", opacity: 0.4 }}>·</span>
          {[
            { label: "Return Policy", href: "/return-policy" },
            { label: "Privacy Policy", href: "/privacy-policy" },
            { label: "Terms & Conditions", href: "/terms-conditions" },
          ].map((item, i, arr) => (
            <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link
                href={item.href}
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  transition: "color 0.18s",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
              >
                {item.label}
              </Link>
              {i < arr.length - 1 && (
                <span style={{ fontSize: 13, color: "var(--text-muted)", opacity: 0.4 }}>·</span>
              )}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
