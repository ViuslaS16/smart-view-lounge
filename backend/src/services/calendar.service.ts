import { google } from 'googleapis';

function getAuthClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_ADMIN_REFRESH_TOKEN });
  return auth;
}

export async function createCalendarEvent(params: {
  bookingId: string;
  customerName: string;
  customerMobile: string;
  startTime: string;
  endTime: string;
  amountPaid: number | string;
}): Promise<void> {
  if (!process.env.GOOGLE_ADMIN_REFRESH_TOKEN) {
    console.warn('[Calendar] Google refresh token not configured — skipping');
    return;
  }

  try {
    const auth     = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    const ref      = params.bookingId;

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary:     `Theater Booking — ${params.customerName} | Ref: ${ref}`,
        description: [
          `Customer: ${params.customerName}`,
          `Mobile: ${params.customerMobile}`,
          `Amount Paid: LKR ${params.amountPaid}`,
          `Booking ID: ${params.bookingId}`,
          '',
          'Remember to TURN ON the theater 10 minutes before start.',
        ].join('\n'),
        start:       { dateTime: params.startTime, timeZone: 'Asia/Colombo' },
        end:         { dateTime: params.endTime,   timeZone: 'Asia/Colombo' },
        colorId:     '9', // Blueberry
        reminders: {
          useDefault: false,
          overrides:  [{ method: 'popup', minutes: 30 }],
        },
      },
    });

    console.log(`[Calendar] Event created for booking ${ref}`);
  } catch (err: any) {
    console.error('[Calendar] Failed to create event:', err.message);
  }
}
