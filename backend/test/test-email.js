/**
 * Test: All Resend email templates
 * Sends one of each email type to verify the API key and HTML templates work.
 * 
 * Usage: node tests/test-email.js [your@email.com]
 */
const { Resend } = require('resend');
const { config } = require('dotenv');
config();

const TO   = process.argv[2] || 'delivered@resend.dev'; // resend test address
const FROM = process.env.EMAIL_FROM ?? 'SmartView Lounge <onboarding@resend.dev>';
// ↑ using resend's sandbox domain until smartviewlounge.lk is verified

const resend = new Resend(process.env.RESEND_API_KEY);
const sleep  = (ms) => new Promise(r => setTimeout(r, ms));

async function send(subject, html) {

  const { data, error } = await resend.emails.send({ from: FROM, to: TO, subject, html });
  if (error) throw new Error(JSON.stringify(error));
  return data.id;
}

async function run() {
  console.log(`\n🔑 API Key: ${process.env.RESEND_API_KEY?.slice(0, 10)}...`);
  console.log(`📬 Sending to: ${TO}\n`);

  // 1. Booking Confirmation
  process.stdout.write('1. Booking Confirmation... ');
  const id1 = await send('Booking Confirmed — SmartView Lounge', `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0A0B;color:#F0EAE0;padding:40px;border-radius:12px;">
      <h2 style="color:#C9933A;margin-bottom:8px;">Booking Confirmed</h2>
      <p>Hi Test User,</p>
      <p>Your private cinema session is confirmed. Here are your details:</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        <tr><td style="padding:10px 0;color:#A09080;border-bottom:1px solid #222;">Booking Ref</td><td style="padding:10px 0;border-bottom:1px solid #222;">SVL-TEST01</td></tr>
        <tr><td style="padding:10px 0;color:#A09080;border-bottom:1px solid #222;">Session Start</td><td style="padding:10px 0;border-bottom:1px solid #222;">8 Apr 2026, 12:00 PM</td></tr>
        <tr><td style="padding:10px 0;color:#A09080;border-bottom:1px solid #222;">Session End</td><td style="padding:10px 0;border-bottom:1px solid #222;">8 Apr 2026, 2:00 PM</td></tr>
        <tr><td style="padding:10px 0;color:#A09080;border-bottom:1px solid #222;">Duration</td><td style="padding:10px 0;border-bottom:1px solid #222;">2 hour(s)</td></tr>
        <tr><td style="padding:10px 0;color:#A09080;">Amount Paid</td><td style="padding:10px 0;color:#C9933A;font-weight:bold;">LKR 3000</td></tr>
      </table>
      <p style="color:#A09080;font-size:13px;">You will receive an SMS reminder 15 minutes before your session ends.</p>
      <p style="color:#5A5050;font-size:12px;margin-top:32px;">SmartView Lounge · Sri Lanka's Private Cinema Experience</p>
    </div>
  `);
  console.log(`✅ Sent (id: ${id1})`);
  await sleep(700);

  // 2. Welcome Email

  process.stdout.write('2. Welcome Email... ');
  const id2 = await send('Welcome to SmartView Lounge — Account Created', `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0A0B;color:#F0EAE0;padding:40px;border-radius:12px;">
      <h2 style="color:#C9933A;">Welcome, Test User</h2>
      <p>Your account has been created successfully.</p>
      <p>Your NIC is under review. Once approved, you will be able to book your private cinema session.</p>
      <p style="color:#5A5050;font-size:12px;margin-top:32px;">SmartView Lounge · Sri Lanka's Private Cinema Experience</p>
    </div>
  `);
  console.log(`✅ Sent (id: ${id2})`);
  await sleep(700);

  // 3. Account Approved
  process.stdout.write('3. Account Approved... ');
  const id3 = await send('Account Approved — SmartView Lounge', `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0A0B;color:#F0EAE0;padding:40px;border-radius:12px;">
      <h2 style="color:#C9933A;">Account Approved</h2>
      <p>Hi Test User,</p>
      <p>Your identity has been verified. You can now book your private cinema session.</p>
      <a href="http://localhost:3000/dashboard/book" style="display:inline-block;margin-top:20px;padding:14px 28px;background:#C9933A;color:#0A0A0B;font-weight:bold;border-radius:10px;text-decoration:none;">Book Now</a>
      <p style="color:#5A5050;font-size:12px;margin-top:32px;">SmartView Lounge · Sri Lanka's Private Cinema Experience</p>
    </div>
  `);
  console.log(`✅ Sent (id: ${id3})`);
  await sleep(700);

  // 4. Account Rejected
  process.stdout.write('4. Account Rejected... ');
  const id4 = await send('Account Verification Update — SmartView Lounge', `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0A0B;color:#F0EAE0;padding:40px;border-radius:12px;">
      <h2 style="color:#E24B4A;">Verification Unsuccessful</h2>
      <p>Hi Test User,</p>
      <p>We were unable to verify your NIC. Reason: <strong>Image was blurry — please re-upload.</strong></p>
      <p>Please log in and re-upload a clear image of your NIC.</p>
      <p style="color:#5A5050;font-size:12px;margin-top:32px;">SmartView Lounge · Sri Lanka's Private Cinema Experience</p>
    </div>
  `);
  console.log(`✅ Sent (id: ${id4})`);
  await sleep(700);

  // 5. Password Reset
  process.stdout.write('5. Password Reset... ');
  const id5 = await send('Reset Your Password — SmartView Lounge', `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0A0A0B;color:#F0EAE0;padding:40px;border-radius:12px;">
      <h2 style="color:#C9933A;">Reset Password</h2>
      <p>Hi Test User,</p>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="http://localhost:3000/reset-password?token=TEST_TOKEN" style="display:inline-block;margin-top:20px;padding:14px 28px;background:#C9933A;color:#0A0A0B;font-weight:bold;border-radius:10px;text-decoration:none;">Reset Password</a>
      <p style="color:#A09080;font-size:13px;margin-top:24px;">If you did not request this, ignore this email.</p>
      <p style="color:#5A5050;font-size:12px;margin-top:32px;">SmartView Lounge · Sri Lanka's Private Cinema Experience</p>
    </div>
  `);
  console.log(`✅ Sent (id: ${id5})`);

  console.log('\n🎉 All 5 email types sent successfully!');
  if (TO === 'delivered@resend.dev') {
    console.log('\n💡 These were sent to Resend\'s test address.');
    console.log('   Run again with your real email to receive them:');
    console.log('   node tests/test-email.js your@email.com');
  }
}

run().catch(e => {
  console.error('\n❌ Email test FAILED:', e.message);
  process.exit(1);
});
