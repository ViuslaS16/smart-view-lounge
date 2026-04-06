"use client";

import Image from "next/image";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="page-center">
      <div className="animate-fade-up" style={{ width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 28, textDecoration: "none" }}>
            <Image src="/logo.png" alt="SmartView Lounge" width={56} height={56} style={{ borderRadius: 14, objectFit: "cover" }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-secondary)" }}>SmartView Lounge</span>
          </Link>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Reset Password
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="animate-fade-up">
            <div className="alert alert-success" style={{ marginBottom: 24 }}>
              <span>📧</span>
              <div>
                <strong>Reset email sent!</strong><br />
                <span style={{ fontSize: 13 }}>Check your inbox at <strong>{email}</strong>. The link expires in 1 hour.</span>
              </div>
            </div>
            <Link href="/login" className="btn btn-primary btn-full">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label" htmlFor="reset-email">Email Address</label>
              <input
                id="reset-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <Link href="/login" className="btn btn-ghost btn-full" style={{ textDecoration: "none" }}>
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
