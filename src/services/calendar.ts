import { google } from 'googleapis';

type BookingParams = {
  summary: string;
  description?: string;
  startISO: string; // ISO datetime
  endISO: string;   // ISO datetime
  attendeeEmail?: string;
};

function getAuthFromEnv() {
  const b64 = process.env.GOOGLE_CALENDAR_SA_B64;
  if (!b64) return null;
  const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
  const scopes = ['https://www.googleapis.com/auth/calendar'];
  const auth = new google.auth.JWT(
    json.client_email,
    undefined,
    json.private_key,
    scopes
  );
  return auth;
}

/**
 * Create a calendar event using a Service Account.
 * Requires `GOOGLE_CALENDAR_SA_B64` and `GOOGLE_CALENDAR_ID` env vars.
 */
export async function createCalendarEvent(params: BookingParams) {
  const auth = getAuthFromEnv();
  if (!auth) {
    return { ok: false, error: 'CALENDAR_AUTH_MISSING' };
  }
  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const attendees = params.attendeeEmail ? [{ email: params.attendeeEmail }] : undefined;

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: params.summary,
      description: params.description || '',
      start: { dateTime: params.startISO },
      end: { dateTime: params.endISO },
      attendees
    }
  });
  return { ok: true, eventId: res.data.id, htmlLink: res.data.htmlLink };
}
