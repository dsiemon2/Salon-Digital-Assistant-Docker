import twilio from 'twilio';
import { createCalendarEvent } from './calendar.js';

/**
 * Attempt direct calendar booking if GOOGLE_* env is set.
 * Falls back to sending a Calendly link via SMS.
 */
export async function createBookingLink(params: { dateTime?: string; durationMins?: number; purpose?: string; contact?: string; email?: string }) {
  const dt = params.dateTime ? new Date(params.dateTime) : null;
  const duration = params.durationMins || 30;
  let calendarTried = false;
  let calendarResult: any = null;

  if (dt && process.env.GOOGLE_CALENDAR_SA_B64) {
    calendarTried = true;
    const end = new Date(dt.getTime() + duration * 60000);
    try {
      calendarResult = await createCalendarEvent({
        summary: params.purpose || 'Phone appointment',
        description: `Auto-booked by Voice Receptionist.`,
        startISO: dt.toISOString(),
        endISO: end.toISOString(),
        attendeeEmail: params.email
      });
    } catch (e) {
      calendarResult = { ok: false, error: (e as Error).message };
    }
  }

  const link = calendarResult?.ok && calendarResult?.htmlLink
    ? calendarResult.htmlLink
    : 'https://calendly.com/your-org/intro-call';

  // SMS to caller if possible
  try {
    const to = params.contact;
    const from = process.env.TWILIO_VOICE_NUMBER;
    if (to && (from || process.env.TWILIO_MESSAGING_SERVICE_SID)) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
      const msgPayload: any = {
        to,
        body: calendarResult?.ok
          ? `Booked! Calendar invite: ${link}`
          : `Here is your booking link: ${link}`
      };
      if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
        msgPayload.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
      } else {
        msgPayload.from = from;
      }
      await client.messages.create(msgPayload);
    }
  } catch (e) {
    console.warn('SMS send failed', e);
  }

  return {
    ok: true,
    mode: calendarTried && calendarResult?.ok ? 'calendar' : 'link',
    link,
    calendar: calendarResult
  };
}
