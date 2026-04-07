"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [showPw, setShowPw]             = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [done, setDone]                 = useState(false);
  const [error, setError]               = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset token. Please request a new link.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Invalid or expired reset link. Please request a new one.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div
        style={{
          background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)",
          borderRadius: 12, padding: "20px 24px", display: "flex", gap: 14, alignItems: "flex-start",
        }}
      >
        <AlertCircle size={20} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: "var(--danger)", display: "block", marginBottom: 4 }}>Invalid Link</strong>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            This reset link is missing a token. Please request a new password reset link.
          </span>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="animate-fade-up">
        <div
          style={{
            background: "rgba(52,199,89,0.08)", border: "1px solid rgba(52,199,89,0.25)",
            borderRadius: 12, padding: "20px 24px", display: "flex", gap: 14,
            alignItems: "flex-start", marginBottom: 24,
          }}
        >
          <CheckCircle size={20} style={{ color: "var(--success)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ color: "var(--success)", display: "block", marginBottom: 4 }}>
              Password Changed!
            </strong>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Your password has been updated successfully. You can now sign in with your new password.
            </span>
          </div>
        </div>
        <Link
          href="/login"
          className="btn btn-primary btn-full"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* New Password */}
      <div>
        <label className="label" htmlFor="new-password">New Password</label>
        <div style={{ position: "relative" }}>
          <KeyRound
            size={16}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
          />
          <input
            id="new-password"
            type={showPw ? "text" : "password"}
            className="input"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ paddingLeft: 40, paddingRight: 42 }}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4,
            }}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label className="label" htmlFor="confirm-password">Confirm Password</label>
        <div style={{ position: "relative" }}>
          <KeyRound
            size={16}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
          />
          <input
            id="confirm-password"
            type={showConfirm ? "text" : "password"}
            className="input"
            placeholder="Repeat new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={{ paddingLeft: 40, paddingRight: 42 }}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4,
            }}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Password strength hint */}
      {password && (
        <div style={{ fontSize: 12, color: password.length >= 8 ? "var(--success)" : "var(--text-muted)" }}>
          {password.length >= 8
            ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><CheckCircle size={12} /> Meets minimum length</span>
            : `${8 - password.length} more character${8 - password.length !== 1 ? "s" : ""} required`
          }
        </div>
      )}

      {error && (
        <div
          className="alert animate-fade-up"
          style={{
            background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.25)",
            borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 13,
          }}
        >
          <AlertCircle size={16} style={{ color: "var(--danger)", flexShrink: 0 }} />
          <span style={{ color: "var(--danger)" }}>{error}</span>
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
        {loading ? <><span className="spinner" /> Resetting...</> : <>Reset Password</>}
      </button>

      <Link
        href="/forgot-password"
        className="btn btn-ghost btn-full"
        style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13 }}
      >
        Request a new link
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
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
            Choose a New Password
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Enter a new password for your account. The link expires in 1 hour.
          </p>
        </div>

        <Suspense fallback={<div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
