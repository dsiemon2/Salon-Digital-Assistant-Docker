import { createBookingLink } from '../services/booking.js';

export const tools = {
  async getBusinessHours() {
    return { hours: 'Mon–Fri 9am–6pm', address: '123 Main St, Springfield' };
  },
  async transferToHuman(args: { reason?: string }) {
    // Realtime path would signal server to issue a <Dial>; here we just acknowledge.
    return { ok: true, reason: args?.reason || 'unspecified' };
  },
  async takeMessage(args: { subject?: string; details?: string; contact?: string }) {
    // TODO: Persist + notify via Slack/email
    return { ok: true, ticketId: 'MSG-' + Math.random().toString(36).slice(2, 8), captured: args };
  },
  async bookAppointment(args: { dateTime?: string; purpose?: string; contact?: string; email?: string }) {
    const res = await createBookingLink({ dateTime: args.dateTime, purpose: args.purpose, contact: args.contact, email: args.email });
    return res;
  }
};
