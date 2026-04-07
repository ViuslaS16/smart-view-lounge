import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? 'SmartView Lounge <noreply@smartviewlounge.com>';


export async function sendBookingConfirmationEmail(params: {
  to: string;
  name: string;
  bookingId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  amount: number | string;
}) {
  const { to, name, bookingId, startTime, endTime, durationMinutes, amount } = params;
  const start = new Date(startTime).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' });
  const end   = new Date(endTime).toLocaleString('en-LK',   { timeZone: 'Asia/Colombo' });

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Booking Confirmed — SmartView Lounge`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0A0B;color:#F0EAE0;padding:40px;border-radius:12px;">
        <h2 style="color:#C9933A;margin-bottom:8px;">Booking Confirmed</h2>
        <p>Hi ${name},</p>
        <p>Your private cinema session is confirmed. Here are your details:</p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0;">
          <tr><td style="padding:10px 0;color:#A09080;border-bottom:1px solid #222;">Booking Ref</td><td style="padding:10px 0;border-bottom:1px solid #222;">${bookingId.slice(0, 8).toUpperCase()}</td></tr>
          <tr><td style="padding:10px 0;color:#A09080;border-bottom:1px solid #222;">Session Start</td><td style="padding:10px 0;border-bottom:1px solid #222;">${start}</td></tr>
          <tr><td style="padding:10px 0;color:#A09080;border-bottom:1px solid #222;">Session End</td><td style="padding:10px 0;border-bottom:1px solid #222;">${end}</td></tr>
          <tr><td style="padding:10px 0;color:#A09080;border-bottom:1px solid #222;">Duration</td><td style="padding:10px 0;border-bottom:1px solid #222;">${durationMinutes / 60} hour(s)</td></tr>
          <tr><td style="padding:10px 0;color:#A09080;">Amount Paid</td><td style="padding:10px 0;color:#C9933A;font-weight:bold;">LKR ${amount}</td></tr>
        </table>
        <p style="color:#A09080;font-size:13px;">You will receive an SMS reminder 15 minutes before your session ends.</p>
        <p style="color:#5A5050;font-size:12px;margin-top:32px;">SmartView Lounge · Sri Lanka's Private Cinema Experience</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(params: { to: string; name: string }) {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: 'Welcome to SmartView Lounge — Account Created',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0A0B;color:#F0EAE0;padding:40px;border-radius:12px;">
        <h2 style="color:#C9933A;">Welcome, ${params.name}</h2>
        <p>Your account has been created successfully.</p>
        <p>Your NIC is under review. Once approved, you will be able to book your private cinema session.</p>
        <p style="color:#5A5050;font-size:12px;margin-top:32px;">SmartView Lounge · Sri Lanka's Private Cinema Experience</p>
      </div>
    `,
  });
}

export async function sendAccountApprovedEmail(params: { to: string; name: string }) {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: 'Account Approved — SmartView Lounge',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0A0B;color:#F0EAE0;padding:40px;border-radius:12px;">
        <h2 style="color:#C9933A;">Account Approved</h2>
        <p>Hi ${params.name},</p>
        <p>Your identity has been verified. You can now book your private cinema session.</p>
        <a href="${process.env.CORS_ORIGIN}/dashboard/book" style="display:inline-block;margin-top:20px;padding:14px 28px;background:#C9933A;color:#0A0A0B;font-weight:bold;border-radius:10px;text-decoration:none;">Book Now</a>
        <p style="color:#5A5050;font-size:12px;margin-top:32px;">SmartView Lounge · Sri Lanka's Private Cinema Experience</p>
      </div>
    `,
  });
}

export async function sendAccountRejectedEmail(params: { to: string; name: string; reason: string }) {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: 'Account Verification Update — SmartView Lounge',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0A0B;color:#F0EAE0;padding:40px;border-radius:12px;">
        <h2 style="color:#E24B4A;">Verification Unsuccessful</h2>
        <p>Hi ${params.name},</p>
        <p>We were unable to verify your NIC. Reason: <strong>${params.reason}</strong></p>
        <p>Please log in and re-upload a clear image of your NIC.</p>
        <p style="color:#5A5050;font-size:12px;margin-top:32px;">SmartView Lounge · Sri Lanka's Private Cinema Experience</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(params: { to: string; name: string; resetUrl: string }) {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: 'Reset Your Password — SmartView Lounge',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0A0B;color:#F0EAE0;padding:40px;border-radius:12px;">
        <h2 style="color:#C9933A;">Reset Password</h2>
        <p>Hi ${params.name},</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${params.resetUrl}" style="display:inline-block;margin-top:20px;padding:14px 28px;background:#C9933A;color:#0A0A0B;font-weight:bold;border-radius:10px;text-decoration:none;">Reset Password</a>
        <p style="color:#A09080;font-size:13px;margin-top:24px;">If you did not request this, ignore this email.</p>
        <p style="color:#5A5050;font-size:12px;margin-top:32px;">SmartView Lounge · Sri Lanka's Private Cinema Experience</p>
      </div>
    `,
  });
}
