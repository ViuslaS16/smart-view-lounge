"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");

    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="animate-fade-up" style={{ width: "100%" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link
            href="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 28, textDecoration: "none" }}
          >
            <Image
              src="/logo.png"
              alt="SmartView Lounge"
              width={56}
              height={56}
              style={{ borderRadius: 14, objectFit: "cover" }}
            />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-secondary)" }}>
              SmartView Lounge
            </span>
          </Link>

          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Reset Password
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Enter your registered email and we&apos;ll send a reset link.
          </p>
        </div>

        {sent ? (
          <div className="animate-fade-up">
            <div
              className="alert"
              style={{
                marginBottom: 24,
                background: "rgba(52,199,89,0.08)",
                border: "1px solid rgba(52,199,89,0.25)",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
              }}
            >
              <CheckCircle size={20} style={{ color: "var(--success)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: "var(--success)", display: "block", marginBottom: 4 }}>
                  Reset email sent!
                </strong>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  If <strong>{email}</strong> is registered, you&apos;ll receive a reset link shortly.
                  The link expires in <strong>1 hour</strong>.
                </span>
              </div>
            </div>

            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6, padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
              <strong style={{ color: "var(--text-secondary)" }}>Didn&apos;t receive it?</strong> Check your spam folder,
              or try again with the same email below.
            </div>

            <Link href="/login" className="btn btn-primary btn-full" style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <ArrowLeft size={16} />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label" htmlFor="reset-email">Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  style={{
                    position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                    color: "var(--text-muted)", pointerEvents: "none",
                  }}
                />
                <input
                  id="reset-email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            {error && (
              <div
                className="alert animate-fade-up"
                style={{
                  background: "rgba(255,59,48,0.08)",
                  border: "1px solid rgba(255,59,48,0.25)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <AlertCircle size={16} style={{ color: "var(--danger)", flexShrink: 0 }} />
                <span style={{ color: "var(--danger)" }}>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? (
                <><span className="spinner" /> Sending...</>
              ) : (
                <><Mail size={16} /> Send Reset Link</>
              )}
            </button>

            <Link
              href="/login"
              className="btn btn-ghost btn-full"
              style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <ArrowLeft size={16} />
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
