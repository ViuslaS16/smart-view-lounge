"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { formatLKR } from "@/lib/utils";
import { useApi } from "@/lib/hooks";

function PaymentContent() {
  const params = useSearchParams();
  const router = useRouter();
  const bookingId = params.get("id");
  
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  
  const { data: bookingData, isLoading: isBookingLoading, error: bookingError } = useApi<{ booking: any }>(bookingId ? `/bookings/${bookingId}` : null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!bookingData?.booking?.created_at) return;
    
    // Check if the booking is already confirmed, completed, or cancelled
    if (bookingData.booking.status !== 'pending') {
      router.replace(`/dashboard/bookings/${bookingId}`);
      return;
    }

    const created = new Date(bookingData.booking.created_at).getTime();
    const expiryTime = created + 10 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = expiryTime - now;
      if (remaining <= 0) {
        setIsExpired(true);
        setTimeLeft(0);
      } else {
        setTimeLeft(Math.floor(remaining / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [bookingData, router, bookingId]);

  if (!bookingId || bookingError) {
    return (
      <div className="page-center text-center">
        <p className="text-secondary">Invalid booking ID</p>
        <button onClick={() => router.push('/dashboard')} className="btn btn-primary mt-4">Go to Dashboard</button>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      let fileToProcess = selected;
      const isHeic = selected.name.toLowerCase().endsWith(".heic") || selected.name.toLowerCase().endsWith(".heif") || selected.type === "image/heic";

      if (isHeic) {
        try {
          const heic2any = (await import("heic2any")).default;
          const converted = await heic2any({
            blob: selected,
            toType: "image/jpeg",
            quality: 0.8
          });
          const blob = Array.isArray(converted) ? converted[0] : converted;
          fileToProcess = new File([blob], selected.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" });
        } catch (err) {
          console.error("HEIC conversion failed:", err);
          alert("Failed to convert HEIC image. Please try uploading a JPG or PNG.");
          return;
        }
      }

      setFile(fileToProcess);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(fileToProcess);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('receipt', file);

      await apiFetch(`/bookings/${bookingId}/receipt`, {
        method: 'POST',
        body: formData,
        // apiFetch handles binary when body is FormData
      });

      router.push(`/dashboard/book/success?ref=${bookingId}&status=verifying`);
    } catch (err: any) {
      alert(err.message || 'Failed to upload receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ paddingTop: 80 }}>
      <div className="animate-fade-up">
        {isExpired ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--error, #e53e3e)' }}>
            <div style={{ color: '#e53e3e', marginBottom: 16 }}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ margin: '0 auto' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#e53e3e' }}>
              Session Expired
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
              The 10-minute hold for this booking has expired. The time slot has been released.
            </p>
            <button onClick={() => router.push('/dashboard/book')} className="btn btn-primary">
              Book a New Slot
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700 }}>
                Complete Your Payment
              </h1>
              {timeLeft !== null && (
                <div style={{ 
                  background: timeLeft < 60 ? 'rgba(229, 62, 62, 0.1)' : 'rgba(201, 147, 58, 0.1)', 
                  color: timeLeft < 60 ? '#e53e3e' : 'var(--accent)', 
                  padding: '6px 12px', 
                  borderRadius: 20, 
                  fontWeight: 600,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>
              Please transfer the total amount to the bank account below and upload your receipt within 10 minutes.
            </p>

        {/* Bank Details Card */}
        <div className="card" style={{ padding: 24, marginBottom: 32, border: '1px solid var(--accent)' }}>
          <div className="badge badge-gold" style={{ marginBottom: 16 }}>SAMPATH BANK</div>
          
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <p className="label">Account Number</p>
              <p style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: 1 }} className="text-gold">
                1098 5521 4416
              </p>
            </div>
            <div>
              <p className="label">Account Name</p>
              <p style={{ fontWeight: 600 }}>H D S T FERNANDO</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <p className="label">Bank</p>
                <p style={{ fontSize: 13, fontWeight: 600 }}>SAMPATH BANK</p>
              </div>
              <div>
                <p className="label">Branch</p>
                <p style={{ fontSize: 13, fontWeight: 600 }}>JA ELA BRANCH</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div style={{ marginBottom: 32 }}>
          <label className="label" style={{ marginBottom: 12 }}>Upload Payment Receipt</label>
          <div 
            className={`upload-zone ${preview ? 'active' : ''}`}
            onClick={() => document.getElementById('receipt-upload')?.click()}
            style={{ minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
          >
            {preview ? (
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <img src={preview} alt="Receipt Preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                <p style={{ marginTop: 12, fontSize: 12, color: 'var(--accent)' }}>Tap to change receipt</p>
              </div>
            ) : (
              <>
                <div style={{ color: 'var(--accent)', marginBottom: 12 }}>
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>Select or Drop Receipt Image</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG, WebP or HEIC</p>
              </>
            )}
            <input 
              id="receipt-upload" 
              type="file" 
              accept="image/*, .heic, .heif" 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
          </div>
        </div>

        <button
          onClick={handleUpload}
          className="btn btn-primary btn-full btn-lg"
          disabled={!file || loading}
        >
          {loading ? <span className="spinner" /> : null}
          {loading ? 'Uploading & Verifying...' : 'Submit Payment Receipt'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Once you submit, our team will verify the payment within 30 minutes. 
          You will receive your door PIN via SMS upon approval.
        </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentContent />
    </Suspense>
  );
}
