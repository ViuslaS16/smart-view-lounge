"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { formatLKR } from "@/lib/utils";

function PaymentContent() {
  const params = useSearchParams();
  const router = useRouter();
  const bookingId = params.get("id");
  
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  if (!bookingId) {
    return (
      <div className="page-center text-center">
        <p className="text-secondary">Invalid booking ID</p>
        <button onClick={() => router.push('/dashboard')} className="btn btn-primary mt-4">Go to Dashboard</button>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
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
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
          Complete Your Payment
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>
          Please transfer the total amount to the bank account below and upload your receipt.
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
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG or WebP</p>
              </>
            )}
            <input 
              id="receipt-upload" 
              type="file" 
              accept="image/*" 
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
          {loading ? 'Verifying Receipt...' : 'Confirm & Send for Verification'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Once you submit, our team will verify the payment within 30 minutes. 
          You will receive your door PIN via SMS upon approval.
        </p>
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
