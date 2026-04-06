"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        
        <div style={{ fontSize: 16, lineHeight: 1.8, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 24 }}>
          <p>Last updated: April 2026</p>
          
          <p>At SmartView Lounge, your privacy and security are our highest priorities. This Privacy Policy outlines what information we collect, how we use it, and how we protect your data.</p>
          
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>1. Information We Collect</h2>
          <p>To provide our automated booking and facility access services, we collect:</p>
          <ul style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <li><strong>Personal Details:</strong> Name, phone number, and email address collected during registration.</li>
            <li><strong>Identity Verification:</strong> A copy or details of your National Identity Card (NIC) to verify your identity.</li>
            <li><strong>Booking Data:</strong> Reservation dates, times, and payment transaction metadata.</li>
          </ul>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>2. How We Use Your Information</h2>
          <p>Your information is used strictly to deliver and improve our services:</p>
          <ul style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            <li>To manage your account and confirm bookings.</li>
            <li>To generate and send unique access PINs for the automated door lock via SMS.</li>
            <li>To verify your identity and ensure the security of our private facility.</li>
            <li>To communicate important updates, schedule changes, or promotional offers (with your consent).</li>
          </ul>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>3. Data Protection and Security</h2>
          <p>We implement industry-standard security measures to protect your personal data. NIC uploads and sensitive personal details are stored securely. We do not sell, trade, or otherwise transfer your personal information to outside parties except trusted third parties who assist us in operating our website or conducting our business, so long as those parties agree to keep this information confidential.</p>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>4. Facility Security Cameras</h2>
          <p>For the safety of our guests and to protect our screening equipment, SmartView Lounge is equipped with security cameras in the common areas and lounge entrance. Cameras are strictly prohibited inside the private screening rooms to ensure your privacy.</p>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>5. Contact Us</h2>
          <p>If you have any questions regarding this Privacy Policy, please contact us via our official support channels.</p>
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
