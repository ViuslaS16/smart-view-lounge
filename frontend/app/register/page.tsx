"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch, setAccessToken } from "@/lib/api";
import { Hourglass, ClipboardList, Smartphone, Check, X, IdCard, RefreshCcw } from "lucide-react";

type Step = "form" | "otp" | "pending";

interface FormData {
  full_name: string;
  mobile: string;
  email: string;
  password: string;
  confirm_password: string;
  nic_number: string;
}

interface FormErrors {
  full_name?: string;
  mobile?: string;
  email?: string;
  password?: string;
  confirm_password?: string;
  nic_number?: string;
  nic_front?: string;
  nic_back?: string;
  terms?: string;
  form?: string;
  otp?: string;
}

// ─── Sri Lankan NIC age calculation ────────────────────────────────────────────
// Old NIC: 9 digits + V/X  → first 2 digits = birth year (19xx), digits 3-5 = day of year (>500 for female)
// New NIC: 12 digits        → first 4 digits = birth year, digits 5-7 = day of year
function getAgeFromNIC(nic: string): number | null {
  const clean = nic.trim().toUpperCase();

  if (/^[0-9]{9}[VX]$/.test(clean)) {
    // Old NIC format: YY + DDD + NNNNN + V/X
    const year = 1900 + parseInt(clean.substring(0, 2), 10);
    let dayOfYear = parseInt(clean.substring(2, 5), 10);
    if (dayOfYear > 500) dayOfYear -= 500; // Female offset
    const birthDate = dayOfYearToDate(year, dayOfYear);
    return calculateAge(birthDate);
  }

  if (/^[0-9]{12}$/.test(clean)) {
    // New NIC format: YYYY + DDD + NNNNNNN
    const year = parseInt(clean.substring(0, 4), 10);
    let dayOfYear = parseInt(clean.substring(4, 7), 10);
    if (dayOfYear > 500) dayOfYear -= 500; // Female offset
    const birthDate = dayOfYearToDate(year, dayOfYear);
    return calculateAge(birthDate);
  }

  return null;
}

function dayOfYearToDate(year: number, dayOfYear: number): Date {
  const date = new Date(year, 0); // Jan 1 of the year
  date.setDate(dayOfYear);
  return date;
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}
// ───────────────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);

  // OTP State
  const [otpCode, setOtpCode] = useState("");

  // NIC Front
  const [nicFrontFile, setNicFrontFile] = useState<File | null>(null);
  const [nicFrontPreview, setNicFrontPreview] = useState<string | null>(null);
  const [dragOverFront, setDragOverFront] = useState(false);
  const frontInputRef = useRef<HTMLInputElement>(null);

  // NIC Back
  const [nicBackFile, setNicBackFile] = useState<File | null>(null);
  const [nicBackPreview, setNicBackPreview] = useState<string | null>(null);
  const [dragOverBack, setDragOverBack] = useState(false);
  const backInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    full_name: "", mobile: "", email: "",
    password: "", confirm_password: "", nic_number: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Live age derived from NIC
  const detectedAge = getAgeFromNIC(formData.nic_number);

  function getFormattedMobile() {
    let formattedMobile = formData.mobile.replace(/\s+/g, '');
    if (formattedMobile.startsWith('0')) {
      formattedMobile = '+94' + formattedMobile.substring(1);
    } else if (formattedMobile.startsWith('94')) {
      formattedMobile = '+' + formattedMobile;
    }
    return formattedMobile;
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!formData.full_name.trim() || formData.full_name.trim().length < 2)
      newErrors.full_name = "Full name must be at least 2 characters.";
    if (!formData.mobile.match(/^\+?94[0-9]{9}$|^0[0-9]{9}$/))
      newErrors.mobile = "Enter a valid Sri Lankan mobile number (+94 or 07x).";
    if (!formData.email.includes("@"))
      newErrors.email = "Enter a valid email address.";
    if (formData.password.length < 8)
      newErrors.password = "Password must be at least 8 characters.";
    if (formData.password !== formData.confirm_password)
      newErrors.confirm_password = "Passwords do not match.";
    if (!formData.nic_number.match(/^[0-9]{9}[VXvx]$|^[0-9]{12}$/))
      newErrors.nic_number = "Enter a valid NIC (e.g. 982345678V or 199823456789).";
    else if (detectedAge !== null && detectedAge < 18)
      newErrors.nic_number = `You must be 18 or older to register. Your NIC shows age ${detectedAge}.`;
    if (!nicFrontFile)
      newErrors.nic_front = "Please upload the front side of your NIC.";
    if (!nicBackFile)
      newErrors.nic_back = "Please upload the back side of your NIC.";
    if (!agreeTerms)
      newErrors.terms = "You must agree to our Terms & Conditions and Privacy Policy to register.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    
    try {
      const formattedMobile = getFormattedMobile();

      await apiFetch("/auth/send-registration-otp", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          mobile: formattedMobile,
        })
      });

      setStep("otp");
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, form: err.message || "Failed to send OTP. Please try again." }));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtpAndRegister(e: React.FormEvent) {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrors((prev) => ({ ...prev, otp: "Please enter a valid 6-digit OTP." }));
      return;
    }
    
    setLoading(true);
    setErrors((prev) => ({ ...prev, otp: undefined, form: undefined }));

    try {
      const formattedMobile = getFormattedMobile();

      // 1. Verify OTP & Register the user simultaneously
      const registerData = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          mobile: formattedMobile,
          password: formData.password,
          otp: otpCode,
        })
      });

      // Store the access token so the NIC upload (authenticated route) works
      if (registerData.accessToken) {
        setAccessToken(registerData.accessToken);
      }

      // 2. Upload the NIC Images
      const uploadData = new FormData();
      uploadData.append("nic_number", formData.nic_number);
      if (nicFrontFile) uploadData.append("nic_front", nicFrontFile);
      if (nicBackFile) uploadData.append("nic_back", nicBackFile);

      await apiFetch("/users/nic", {
        method: "POST",
        // Do not set Content-Type for FormData, the browser handles the boundary
        body: uploadData
      });

      setStep("pending");
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, form: err.message || "Registration failed. Please try again." }));
    } finally {
      setLoading(false);
    }
  }

  function handleField(field: keyof FormData, value: string) {
    setFormData((p) => ({ ...p, [field]: value }));
    if (errors[field as keyof FormErrors]) setErrors((p) => ({ ...p, [field]: undefined }));
  }

  function handleFile(
    file: File,
    side: "front" | "back",
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void,
    errorKey: "nic_front" | "nic_back"
  ) {
    if (!file.type.startsWith("image/")) {
      setErrors((p) => ({ ...p, [errorKey]: "Please upload an image file (JPG, PNG)." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, [errorKey]: "File size must be under 5MB." }));
      return;
    }
    setFile(file);
    setErrors((p) => ({ ...p, [errorKey]: undefined }));
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  // ── Pending state ───────────────────────────────────────────────────────────
  if (step === "pending") {
    return (
      <div className="page-center" style={{ textAlign: "center", padding: "24px 20px" }}>
        <div className="animate-fade-up">
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "rgba(240,160,48,0.1)", border: "2px solid rgba(240,160,48,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px", color: "var(--warning)",
          }}><Hourglass size={32} /></div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginBottom: 12 }}>
            Verification Pending
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.7, maxWidth: 340, margin: "0 auto 12px" }}>
            Your account has been created. Our team is reviewing your NIC — this usually takes a few hours.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 36 }}>
            You&apos;ll receive an SMS once your account is approved.
          </p>
          <div className="alert alert-warning" style={{ maxWidth: 340, margin: "0 auto 32px", textAlign: "left" }}>
            <span style={{ display: "flex", alignItems: "center" }}><ClipboardList size={18} /></span>
            <div>
              <strong style={{ display: "block", marginBottom: 4 }}>What to expect:</strong>
              Admin will review your NIC front &amp; back images and approve your account. Once approved, you can browse and book sessions.
            </div>
          </div>
          <Link href="/login" className="btn btn-primary btn-full" style={{ maxWidth: 340, margin: "0 auto", display: "flex" }}>
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // ── OTP State ───────────────────────────────────────────────────────────────
  if (step === "otp") {
    return (
      <div className="page-center" style={{ textAlign: "center", padding: "24px 20px" }}>
        <div className="animate-fade-up">
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "rgba(61,184,122,0.1)", border: "2px solid rgba(61,184,122,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px", color: "var(--success)",
          }}><Smartphone size={32} /></div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginBottom: 12 }}>
            Verify your mobile
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.7, maxWidth: 340, margin: "0 auto 32px" }}>
            We sent a 6-digit verification code to <strong>{formData.mobile}</strong>.
          </p>

          <form onSubmit={handleVerifyOtpAndRegister} style={{ maxWidth: 340, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <input
                className={`input${errors.otp ? " input-error" : ""}`}
                placeholder="Enter 6-digit OTP"
                style={{ textAlign: 'center', fontSize: 20, letterSpacing: 4 }}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              {errors.otp && <p className="field-error" style={{ textAlign: 'left' }}>{errors.otp}</p>}
            </div>

            {errors.form && <div className="alert alert-error" style={{ textAlign: 'left' }}>{errors.form}</div>}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading || otpCode.length !== 6}>
              {loading ? <span className="spinner" /> : null}
              {loading ? "Verifying..." : "Verify & Create Account"}
            </button>

            <button type="button" className="btn btn-secondary btn-full" disabled={loading} onClick={() => setStep("form")}>
              Go Back
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="page-center" style={{ paddingTop: 60, paddingBottom: 60 }}>
      <div className="animate-fade-up" style={{ width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 28, textDecoration: "none" }}>
            <Image src="/logo.png" alt="SmartView Lounge" width={56} height={56} style={{ borderRadius: 14 }} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-secondary)" }}>SmartView Lounge</span>
          </Link>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Create your account</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Identity verification required for your first booking</p>
        </div>

        <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Full name */}
          <div>
            <label className="label" htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              className={`input${errors.full_name ? " input-error" : ""}`}
              placeholder="As per your NIC"
              value={formData.full_name}
              onChange={(e) => handleField("full_name", e.target.value)}
            />
            {errors.full_name && <p className="field-error">{errors.full_name}</p>}
          </div>

          {/* Mobile */}
          <div>
            <label className="label" htmlFor="mobile">Mobile Number</label>
            <input
              id="mobile"
              className={`input${errors.mobile ? " input-error" : ""}`}
              placeholder="+94 77 123 4567"
              value={formData.mobile}
              onChange={(e) => handleField("mobile", e.target.value)}
            />
            {errors.mobile && <p className="field-error">{errors.mobile}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className={`input${errors.email ? " input-error" : ""}`}
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => handleField("email", e.target.value)}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          {/* Password row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={`input${errors.password ? " input-error" : ""}`}
                placeholder="Min 8 characters"
                value={formData.password}
                onChange={(e) => handleField("password", e.target.value)}
              />
              {errors.password && <p className="field-error">{errors.password}</p>}
            </div>
            <div>
              <label className="label" htmlFor="confirm_password">Confirm Password</label>
              <input
                id="confirm_password"
                type="password"
                className={`input${errors.confirm_password ? " input-error" : ""}`}
                placeholder="Repeat password"
                value={formData.confirm_password}
                onChange={(e) => handleField("confirm_password", e.target.value)}
              />
              {errors.confirm_password && <p className="field-error">{errors.confirm_password}</p>}
            </div>
          </div>

          {/* NIC number with live age badge */}
          <div>
            <label className="label" htmlFor="nic_number">NIC Number</label>
            <div style={{ position: "relative" }}>
              <input
                id="nic_number"
                className={`input${errors.nic_number ? " input-error" : ""}`}
                placeholder="982345678V or 199823456789"
                value={formData.nic_number}
                onChange={(e) => handleField("nic_number", e.target.value)}
                style={{ paddingRight: detectedAge !== null ? 110 : undefined }}
              />
              {detectedAge !== null && (
                <div style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 999,
                  background: detectedAge >= 18 ? "rgba(61,184,122,0.12)" : "rgba(226,75,74,0.12)",
                  border: `1px solid ${detectedAge >= 18 ? "rgba(61,184,122,0.3)" : "rgba(226,75,74,0.3)"}`,
                  fontSize: 12, fontWeight: 700, pointerEvents: "none",
                  color: detectedAge >= 18 ? "var(--success)" : "var(--danger)",
                }}>
                  {detectedAge >= 18 ? <Check size={14} /> : <X size={14} />} Age {detectedAge}
                </div>
              )}
            </div>
            {errors.nic_number
              ? <p className="field-error">{errors.nic_number}</p>
              : detectedAge !== null && detectedAge < 18
                ? <p className="field-error">You must be 18 or older to use SmartView Lounge.</p>
                : detectedAge !== null && detectedAge >= 18
                  ? <p style={{ fontSize: 12, color: "var(--success)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}><Check size={14} /> Age verified — you&apos;re eligible to register.</p>
                  : <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Enter your NIC to auto-verify your age.</p>
            }
          </div>

          {/* ── NIC Images side by side ── */}
          <div>
            <p className="label" style={{ marginBottom: 12 }}>NIC Images</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Front */}
              <NicUploadSlot
                label="Front Side"
                icon={<IdCard size={26} />}
                preview={nicFrontPreview}
                file={nicFrontFile}
                dragOver={dragOverFront}
                error={errors.nic_front}
                inputRef={frontInputRef}
                onClear={() => { setNicFrontFile(null); setNicFrontPreview(null); }}
                onDragOver={() => setDragOverFront(true)}
                onDragLeave={() => setDragOverFront(false)}
                onDrop={(f) => handleFile(f, "front", setNicFrontFile, setNicFrontPreview, "nic_front")}
                onClick={() => frontInputRef.current?.click()}
                onChange={(f) => handleFile(f, "front", setNicFrontFile, setNicFrontPreview, "nic_front")}
              />
              {/* Back */}
              <NicUploadSlot
                label="Back Side"
                icon={<RefreshCcw size={26} />}
                preview={nicBackPreview}
                file={nicBackFile}
                dragOver={dragOverBack}
                error={errors.nic_back}
                inputRef={backInputRef}
                onClear={() => { setNicBackFile(null); setNicBackPreview(null); }}
                onDragOver={() => setDragOverBack(true)}
                onDragLeave={() => setDragOverBack(false)}
                onDrop={(f) => handleFile(f, "back", setNicBackFile, setNicBackPreview, "nic_back")}
                onClick={() => backInputRef.current?.click()}
                onChange={(f) => handleFile(f, "back", setNicBackFile, setNicBackPreview, "nic_back")}
              />
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              Both sides required · JPG or PNG · Max 5MB each
            </p>
          </div>

          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={agreeTerms} 
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (e.target.checked && errors.terms) setErrors((p) => ({ ...p, terms: undefined }));
                }}
                style={{ marginTop: 2, accentColor: "#C9933A", width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)" }}>
                I agree to the <Link href="/terms-conditions" target="_blank" style={{ color: "var(--accent)", textDecoration: "none" }}>Terms &amp; Conditions</Link> and <Link href="/privacy-policy" target="_blank" style={{ color: "var(--accent)", textDecoration: "none" }}>Privacy Policy</Link>.
              </span>
            </label>
            {errors.terms && <p className="field-error">{errors.terms}</p>}
          </div>

          {errors.form && <div className="alert alert-error">{errors.form}</div>}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <span className="spinner" /> : null}
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

// ── Reusable NIC upload slot component ────────────────────────────────────────
function NicUploadSlot({
  label, icon, preview, file, dragOver, error, inputRef,
  onClear, onDragOver, onDragLeave, onDrop, onClick, onChange,
}: {
  label: string;
  icon: React.ReactNode;
  preview: string | null;
  file: File | null;
  dragOver: boolean;
  error?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onClear: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (f: File) => void;
  onClick: () => void;
  onChange: (f: File) => void;
}) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
        {label}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
      />
      {preview ? (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "3/2" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button
            type="button"
            onClick={onClear}
            style={{
              position: "absolute", top: 8, right: 8,
              background: "rgba(0,0,0,0.75)", border: "none", borderRadius: "50%",
              width: 26, height: 26, cursor: "pointer", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          ><X size={16} /></button>
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
            padding: "16px 10px 8px",
            fontSize: 11, color: "var(--success)", fontWeight: 600,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Check size={12} /> {file?.name?.slice(0, 18)}{(file?.name?.length ?? 0) > 18 ? "…" : ""}</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            border: `2px dashed ${error ? "var(--danger)" : dragOver ? "var(--accent)" : "var(--border-subtle)"}`,
            borderRadius: 12, padding: "20px 12px", textAlign: "center",
            background: dragOver ? "rgba(201,147,58,0.05)" : "var(--bg-card)",
            cursor: "pointer", transition: "all 0.15s ease",
            aspectRatio: "3/2", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}
          onClick={onClick}
          onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
          onDragLeave={onDragLeave}
          onDrop={(e) => { e.preventDefault(); onDragLeave(); const f = e.dataTransfer.files[0]; if (f) onDrop(f); }}
        >
          <div style={{ marginBottom: 8, color: "var(--text-secondary)" }}>{icon}</div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
            Upload {label}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Tap or drag</p>
        </div>
      )}
      {error && <p className="field-error" style={{ marginTop: 6, fontSize: 11 }}>{error}</p>}
    </div>
  );
}
