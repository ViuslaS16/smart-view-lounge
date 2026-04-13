import 'dotenv/config';
import { sendBookingConfirmationEmail } from './src/services/email.service';

sendBookingConfirmationEmail({
  to: 'visula@smartviewlounge.com',
  name: 'Visula Siriwardana',
  bookingId: 'af3ff1ad-0000-0000-0000-000000000000',
  startTime: new Date(Date.now() + 60 * 60000).toISOString(),
  endTime:   new Date(Date.now() + 120 * 60000).toISOString(),
  durationMinutes: 60,
  amount: 2500,
}).then(() => console.log('✅ Test email sent!')).catch(console.error);
