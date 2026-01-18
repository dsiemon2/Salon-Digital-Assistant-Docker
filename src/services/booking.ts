import twilio from 'twilio';
import { createCalendarEvent } from './calendar.js';

/**
 * Attempt direct calendar booking via Google Calendar.
 * Fallback to sending a booking link via SMS.
 */
export async function createBookingLink(params: {
  dateTime?: string;
  durationMins?: number;
  purpose?: string;
  contact?: string;
  email?: string;
}) {
  const dt = params.dateTime ? new Date(params.dateTime) : null;
  const duration = params.durationMins || 30;
  let mode: 'google' | 'link' = 'link';
  let link = process.env.CALENDLY_LINK || 'https://xyzsalon.com/contact';
  let ok = false;

  if (dt && !isNaN(dt.getTime())) {
    const end = new Date(dt.getTime() + duration * 60000);

    // Try Google Calendar if configured
    if (process.env.GOOGLE_CALENDAR_SA_B64) {
      try {
        const g = await createCalendarEvent({
          summary: params.purpose || 'XYZ Salon Appointment',
          description: `Auto-booked by Voice Assistant.\nContact: ${params.contact || 'N/A'}\nEmail: ${params.email || 'N/A'}`,
          startISO: dt.toISOString(),
          endISO: end.toISOString(),
          attendeeEmail: params.email
        });
        if (g?.ok && g.htmlLink) {
          link = g.htmlLink;
          mode = 'google';
          ok = true;
        }
      } catch (e) {
        console.warn('Google Calendar booking failed:', e);
      }
    }
  }

  // SMS to caller if we have their number
  try {
    const to = params.contact;
    const from = process.env.TWILIO_VOICE_NUMBER;
    if (to && from && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        to,
        from,
        body: ok
          ? `Your appointment is booked! Details: ${link}`
          : `Thank you for your interest! Book your appointment here: ${link}`
      });
    }
  } catch (e) {
    console.warn('SMS send failed:', e);
  }

  return { ok: true, mode, link, booked: ok };
}
