import twilio from 'twilio';
import { createCalendarEvent } from './calendar.js';
import { createMsGraphEvent } from './msgraphCalendar.js';

/**
 * Attempt direct calendar booking via Google or Microsoft 365 (Graph).
 * Fallback to sending a Calendly link via SMS.
 */
export async function createBookingLink(params: { dateTime?: string; durationMins?: number; purpose?: string; contact?: string; email?: string }) {
  const dt = params.dateTime ? new Date(params.dateTime) : null;
  const duration = params.durationMins || 30;
  let mode: 'google' | 'microsoft' | 'link' = 'link';
  let link = 'https://calendly.com/your-org/intro-call';
  let ok = false;

  if (dt) {
    const end = new Date(dt.getTime() + duration * 60000);

    // Try Google Calendar first if configured
    if (process.env.GOOGLE_CALENDAR_SA_B64) {
      try {
        const g = await createCalendarEvent({
          summary: params.purpose || 'Phone appointment',
          description: 'Auto-booked by Voice Receptionist.',
          startISO: dt.toISOString(),
          endISO: end.toISOString(),
          attendeeEmail: params.email
        });
        if (g?.ok && g.htmlLink) {
          link = g.htmlLink;
          mode = 'google';
          ok = true;
        }
      } catch {}
    }

    // If not ok, try Microsoft Graph
    if (!ok && process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.M365_CALENDAR_USER) {
      try {
        const m = await createMsGraphEvent({
          subject: params.purpose || 'Phone appointment',
          body: 'Auto-booked by Voice Receptionist.',
          startISO: dt.toISOString(),
          endISO: end.toISOString(),
          attendeeEmail: params.email
        });
        if (m?.ok && m.webLink) {
          link = m.webLink;
          mode = 'microsoft';
          ok = true;
        }
      } catch {}
    }
  }

  // SMS to caller if we have their number
  try {
    const to = params.contact;
    const from = process.env.TWILIO_VOICE_NUMBER;
    if (to && (from || process.env.TWILIO_MESSAGING_SERVICE_SID)) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
      const msgPayload: any = {
        to,
        body: ok
          ? `Booked! Calendar link: ${link}`
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

  return { ok: true, mode, link };
}
