import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? 'SmartView Lounge <noreply@smartviewlounge.com>';

// ─── Shared layout wrappers ────────────────────────────────────────────────────

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SmartView Lounge</title>
</head>
<body style="margin:0;padding:0;background:#0D0D0F;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0F;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:#000000;border-radius:16px 16px 0 0;padding:24px 40px;border-bottom:2px solid #C9933A;text-align:center;">
            <img src="https://smartviewlounge.com/logo.png" alt="SmartView Lounge" width="140" height="140" style="display:block;margin:0 auto;" />
            <div style="font-size:11px;letter-spacing:6px;color:#8A7060;text-transform:uppercase;margin-top:4px;">Private Cinema Lounge · Sri Lanka</div>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:#111113;padding:40px;border-left:1px solid #1E1E22;border-right:1px solid #1E1E22;">
            ${content}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#0A0A0B;border-radius:0 0 16px 16px;padding:28px 40px;border:1px solid #1E1E22;border-top:1px solid #252525;text-align:center;">
            <p style="margin:0 0 8px;font-size:11px;color:#5A5050;letter-spacing:1px;text-transform:uppercase;">SmartView Lounge — Sri Lanka's Finest Private Cinema Experience</p>
            <p style="margin:0;font-size:11px;color:#3A3030;">This is an automated message. Please do not reply to this email.</p>
            <p style="margin:8px 0 0;font-size:11px;color:#3A3030;">For support, contact us at <a href="mailto:info@smartviewlounge.com" style="color:#C9933A;text-decoration:none;">info@smartviewlounge.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function divider(): string {
  return `<tr><td style="padding:0;"><hr style="border:none;border-top:1px solid #252525;margin:24px 0;" /></td></tr>`;
}

function infoRow(label: string, value: string, highlight = false): string {
  return `
  <tr>
    <td style="padding:12px 0;color:#7A6A5A;font-size:13px;letter-spacing:0.5px;border-bottom:1px solid #1E1E22;width:40%;">${label}</td>
    <td style="padding:12px 0;${highlight ? 'color:#C9933A;font-weight:700;font-size:16px;' : 'color:#F0EAE0;font-size:14px;font-weight:500;'}border-bottom:1px solid #1E1E22;">${value}</td>
  </tr>`;
}

function sectionTitle(text: string): string {
  return `<p style="margin:28px 0 12px;font-size:11px;letter-spacing:3px;color:#C9933A;text-transform:uppercase;font-weight:700;">${text}</p>`;
}

function instructionItem(icon: string, text: string): string {
  return `
  <tr>
    <td style="padding:10px 0;vertical-align:top;width:28px;font-size:16px;">${icon}</td>
    <td style="padding:10px 0 10px 8px;font-size:13px;color:#C0B0A0;line-height:1.6;">${text}</td>
  </tr>`;
}

// ─── Booking Confirmation ─────────────────────────────────────────────────────

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

  const fmtOpts: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Colombo',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  const start = new Date(startTime).toLocaleString('en-LK', fmtOpts);
  const end   = new Date(endTime).toLocaleString('en-LK', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hour12: true });
  const ref   = bookingId;
  const hours = durationMinutes / 60;
  const amountFmt = `LKR ${Number(amount).toLocaleString('en-LK')}`;

  const content = `
    <!-- Greeting -->
    <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#F0EAE0;">Booking Confirmed ✓</p>
    <p style="margin:0 0 28px;font-size:14px;color:#7A6A5A;">Hi ${name}, your private cinema session has been successfully reserved.</p>

    <!-- Booking Details -->
    ${sectionTitle('Booking Details')}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${infoRow('Booking Reference', ref)}
      ${infoRow('Session Date & Start', start)}
      ${infoRow('Session End Time', end)}
      ${infoRow('Duration', `${hours} hour${hours !== 1 ? 's' : ''}`)}
      ${infoRow('Amount Paid', amountFmt, true)}
    </table>

    <!-- Door PIN Notice -->
    <div style="margin:28px 0;background:linear-gradient(135deg,#1C1508,#111113);border:1px solid #C9933A;border-radius:10px;padding:20px 24px;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;color:#C9933A;text-transform:uppercase;font-weight:700;">🔐 Door Access PIN</p>
      <p style="margin:0;font-size:13px;color:#C0B0A0;line-height:1.7;">
        Your <strong style="color:#F0EAE0;">unique door access PIN</strong> will be sent to your registered mobile number via SMS
        <strong style="color:#F0EAE0;">15 minutes before your session starts</strong>. 
        The PIN is automatically generated and time-locked — it will only work during your booked session window.
      </p>
    </div>

    <!-- How It Works -->
    ${sectionTitle('How It Works — Fully Automated')}
    <p style="margin:0 0 12px;font-size:13px;color:#7A6A5A;">Everything at SmartView Lounge is handled by our automated system. No staff intervention is required.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${instructionItem('📱', '<strong style="color:#F0EAE0;">SMS with Door PIN</strong> — Sent automatically to your mobile 15 minutes before your session. Enter the PIN followed by <strong style="color:#C9933A;">#</strong> on the door keypad to unlock.')}
      ${instructionItem('❄️', '<strong style="color:#F0EAE0;">AC &amp; Projector</strong> — Automatically switched ON 5 minutes before your session starts. Everything will be ready when you arrive.')}
      ${instructionItem('⏱️', '<strong style="color:#F0EAE0;">Session End</strong> — All devices (AC, projector) will automatically power OFF after your session ends. Your door PIN will also expire immediately.')}
      ${instructionItem('🔔', '<strong style="color:#F0EAE0;">Reminder SMS</strong> — You will receive an SMS reminder 15 minutes before your session ends so you can wrap up on time.')}
    </table>

    <!-- Premises Rules -->
    ${sectionTitle('Premises Rules & Instructions')}
    <table width="100%" cellpadding="0" cellspacing="0">
      ${instructionItem('📋', 'Please read and follow all rules and instructions posted at the premises. They are clearly displayed inside the lounge.')}
      ${instructionItem('🚫', 'Do <strong style="color:#F0EAE0;">not</strong> share your door PIN with anyone. It is uniquely tied to your booking and your identity.')}
      ${instructionItem('🧹', 'Please leave the lounge in a clean and tidy condition for the next guest.')}
      ${instructionItem('⏰', 'Arrive on time. Sessions start and end strictly as booked. Early or late entry is not permitted.')}
      ${instructionItem('📵', 'Do not tamper with any devices, remote controls, or electrical fixtures in the premises.')}
    </table>

    <!-- Support -->
    <div style="margin:28px 0 0;background:#161618;border:1px solid #252525;border-radius:10px;padding:18px 22px;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;color:#7A6A5A;text-transform:uppercase;font-weight:700;">Need Help?</p>
      <p style="margin:0;font-size:13px;color:#A09080;line-height:1.7;">
        All operations are fully automated. If you experience any issue, please contact the administrator directly. 
        <strong style="color:#F0EAE0;">Do not attempt to fix or override any system yourself.</strong>
        Reach us at <a href="mailto:info@smartviewlounge.com" style="color:#C9933A;text-decoration:none;">info@smartviewlounge.com</a>.
      </p>
    </div>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `✓ Booking Confirmed — SmartView Lounge [Ref: ${ref}]`,
    html: emailWrapper(content),
  });
}

// ─── Welcome Email ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(params: { to: string; name: string }) {
  const content = `
    <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#F0EAE0;">Welcome to SmartView Lounge</p>
    <p style="margin:0 0 28px;font-size:14px;color:#7A6A5A;">Hi ${params.name}, your account has been successfully created.</p>

    <div style="background:linear-gradient(135deg,#1C1508,#111113);border:1px solid #C9933A;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 8px;font-size:14px;color:#F0EAE0;font-weight:600;">What happens next?</p>
      <p style="margin:0;font-size:13px;color:#C0B0A0;line-height:1.8;">
        Your NIC (National Identity Card) is currently <strong style="color:#C9933A;">under review</strong> by our team.<br/>
        Once approved, you will receive an email and will be able to book your private cinema session.
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${instructionItem('🪪', '<strong style="color:#F0EAE0;">Verification</strong> — Our team will verify your NIC within 24 hours.')}
      ${instructionItem('✉️', '<strong style="color:#F0EAE0;">Approval Email</strong> — You will be notified by email once your account is approved.')}
      ${instructionItem('🎬', '<strong style="color:#F0EAE0;">Book Your Session</strong> — After approval, log in to book your private cinema experience.')}
    </table>

    <p style="margin:24px 0 0;font-size:12px;color:#5A5050;">This is an automated notification. If you did not create this account, please contact us immediately.</p>
  `;

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: 'Welcome to SmartView Lounge — Account Created',
    html: emailWrapper(content),
  });
}

// ─── Account Approved ─────────────────────────────────────────────────────────

export async function sendAccountApprovedEmail(params: { to: string; name: string }) {
  const bookUrl = `${process.env.CORS_ORIGIN ?? 'https://smartviewlounge.com'}/dashboard/book`;

  const content = `
    <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#4CAF7D;">Account Approved ✓</p>
    <p style="margin:0 0 28px;font-size:14px;color:#7A6A5A;">Hi ${params.name}, great news — your identity has been verified!</p>

    <div style="background:linear-gradient(135deg,#0C1A10,#111113);border:1px solid #4CAF7D;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#C0B0A0;line-height:1.8;">
        Your account is now <strong style="color:#4CAF7D;">fully active</strong>. You can log in and book your first private cinema session at SmartView Lounge.
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${instructionItem('🎬', '<strong style="color:#F0EAE0;">Book Your Session</strong> — Choose your date and time from the booking calendar.')}
      ${instructionItem('💳', '<strong style="color:#F0EAE0;">Secure Payment</strong> — Complete your booking with our secure online payment.')}
      ${instructionItem('📱', '<strong style="color:#F0EAE0;">Get Your PIN</strong> — Receive your door access PIN via SMS before your session automatically.')}
    </table>

    <a href="${bookUrl}" style="display:inline-block;margin-top:28px;padding:14px 32px;background:linear-gradient(135deg,#C9933A,#A07020);color:#0A0A0B;font-weight:800;border-radius:10px;text-decoration:none;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Book Now →</a>
  `;

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: '✓ Account Approved — You Can Now Book at SmartView Lounge',
    html: emailWrapper(content),
  });
}

// ─── Account Rejected ─────────────────────────────────────────────────────────

export async function sendAccountRejectedEmail(params: { to: string; name: string; reason: string }) {
  const content = `
    <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#E24B4A;">Verification Unsuccessful</p>
    <p style="margin:0 0 28px;font-size:14px;color:#7A6A5A;">Hi ${params.name}, we were unable to verify your identity.</p>

    <div style="background:#1A0A0A;border:1px solid #E24B4A;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;color:#E24B4A;text-transform:uppercase;font-weight:700;">Reason for Rejection</p>
      <p style="margin:0;font-size:14px;color:#F0EAE0;font-weight:500;">${params.reason}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${instructionItem('📷', '<strong style="color:#F0EAE0;">Re-upload your NIC</strong> — Log in to your account and submit a clear, well-lit photo of both sides of your NIC.')}
      ${instructionItem('✅', '<strong style="color:#F0EAE0;">Ensure clarity</strong> — Make sure all details are clearly visible and not blurred or cropped.')}
      ${instructionItem('⏳', '<strong style="color:#F0EAE0;">Re-review</strong> — After resubmission, our team will re-verify your identity within 24 hours.')}
    </table>

    <p style="margin:24px 0 0;font-size:12px;color:#5A5050;">If you believe this is an error, please contact us at <a href="mailto:info@smartviewlounge.com" style="color:#C9933A;text-decoration:none;">info@smartviewlounge.com</a>.</p>
  `;

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: 'Account Verification Update — SmartView Lounge',
    html: emailWrapper(content),
  });
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(params: { to: string; name: string; resetUrl: string }) {
  const content = `
    <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#F0EAE0;">Reset Your Password</p>
    <p style="margin:0 0 28px;font-size:14px;color:#7A6A5A;">Hi ${params.name}, we received a request to reset your password.</p>

    <div style="background:#161618;border:1px solid #252525;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#C0B0A0;line-height:1.8;">
        Click the button below to reset your password. This link is valid for <strong style="color:#F0EAE0;">1 hour only</strong> and can only be used once.
      </p>
    </div>

    <a href="${params.resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#C9933A,#A07020);color:#0A0A0B;font-weight:800;border-radius:10px;text-decoration:none;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Reset Password →</a>

    <p style="margin:24px 0 0;font-size:13px;color:#5A5050;">
      If you did not request a password reset, please ignore this email. Your password will remain unchanged.<br/>
      For security concerns, contact us at <a href="mailto:info@smartviewlounge.com" style="color:#C9933A;text-decoration:none;">info@smartviewlounge.com</a>.
    </p>
  `;

  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: 'Reset Your Password — SmartView Lounge',
    html: emailWrapper(content),
  });
}
