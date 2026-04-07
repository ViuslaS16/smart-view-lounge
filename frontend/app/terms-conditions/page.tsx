"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function TermsConditionsPage() {
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
          Terms and Conditions
        </h1>
        
        <div style={{ fontSize: 16, lineHeight: 1.8, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 24 }}>
          <p>Last updated: April 2026</p>
          
          <p>Welcome to SmartView Lounge. By accessing or using our booking service and physical facilities, you agree to be bound by these Terms and Conditions.</p>
          
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>1. User Account and Verification</h2>
          <p>To use our services, you must register for an account and provide a valid National Identity Card (NIC). You are responsible for maintaining the confidentiality of your account credentials. You agree that all information provided during registration is accurate and complete.</p>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>2. Age Restriction Policy</h2>
          <p>By country law, every individual entering the premises must be 18 years of age or older. Entry for anyone under 18 is strictly prohibited. If any user violates this rule, severe legal and company action will be taken against them, as the company is legally obligated to enforce this regulation.</p>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>3. Facility Usage and Conduct</h2>
          <p>SmartView Lounge provides a premium, automated private theater experience. Users agree to:</p>
          <ul style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <li>Use the provided equipment (projectors, sound systems, seating) with care.</li>
            <li>Vacate the premises promptly at the end of the booked time slot.</li>
            <li>Maintain cleanliness and ensure no damage is done to the facility.</li>
            <li>Refrain from any illegal activities within the premises.</li>
          </ul>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>4. Access Codes</h2>
          <p>Access to the lounge is granted via a temporary, unique PIN code generated for your specific time slot. This code must not be shared with unauthorized individuals. You are responsible for the actions of all guests you bring into the lounge.</p>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>5. Damage Liability</h2>
          <p>The registered user holds full financial responsibility for any damage to the audio-visual equipment, furniture, or facility structure occurring during their booked session. SmartView Lounge reserves the right to charge the user for repair or replacement costs.</p>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>6. Technical Support</h2>
          <p>While we ensure high-quality equipment, technical issues may occasionally arise. Support contact details are provided within the lounge. We are not liable for compensation beyond the cost of the booking in case of technical failure.</p>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>7. Modifications to Terms</h2>
          <p>We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting to the website. Continued use of the service signifies your acceptance of the updated terms.</p>
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
