import { createBookingLink } from '../services/booking.js';
import { prisma } from '../db/prisma.js';
import { getDirectory } from '../services/directory.js';
import { askKB } from '../services/kb.js';

async function logIntent(intent: string, meta: any = {}) {
  try {
    await prisma.intentLog.create({ data: { intent, meta: JSON.stringify(meta) } });
  } catch {}
}

export const tools = {
  async getPolicy() {
    const cfg = await prisma.businessConfig.findFirst();
    return { kbMinConfidence: cfg?.kbMinConfidence ?? 0.55, lowConfidenceAction: cfg?.lowConfidenceAction ?? 'ask_clarify' };
  },
  async setLanguage(args: { lang: string }) {
    const lang = (args?.lang || 'en').substring(0,5).toLowerCase();
    try { await prisma.languageLog.create({ data: { language: lang } }); } catch {}
    await logIntent('setLanguage', { lang });
    return { ok: true, lang };
  },
  async getBusinessHours() {
    const cfg = await prisma.businessConfig.findFirst();
    await logIntent('getBusinessHours');
    return {
      hours: cfg?.hoursJson ? JSON.parse(cfg.hoursJson) : { 'Mon–Fri': '9am–6pm' },
      address: cfg?.address || '123 Main St, Springfield'
    };
  },
  async transferToHuman(args: { reason?: string }) {
    await logIntent('transferToHuman', args);
    return { ok: true, reason: args?.reason || 'unspecified' };
  },
  async transferToDepartment(args: { department?: string }) {
    const name = (args?.department || '').trim();
    const depts = await getDirectory();
    const match = depts.find(d => d.name.toLowerCase() === name.toLowerCase());
    await logIntent('transferToDepartment', { department: name, found: !!match });
    if (!match) return { ok: false, error: 'DEPARTMENT_NOT_FOUND' };
    return { ok: true, department: match.name, phone: match.phone };
  },
  async takeMessage(args: { subject?: string; details?: string; contact?: string }) {
    await logIntent('takeMessage', args);
    return { ok: true, ticketId: 'MSG-' + Math.random().toString(36).slice(2, 8), captured: args };
  },
  async bookAppointment(args: { dateTime?: string; purpose?: string; contact?: string; email?: string; durationMins?: number }) {
    await logIntent('bookAppointment', args);
    const res = await createBookingLink({ dateTime: args.dateTime, purpose: args.purpose, contact: args.contact, email: args.email, durationMins: args.durationMins });
    return res;
  },
  async answerQuestion(args: { question: string, language?: string, callSid?: string }) {
    await logIntent('answerQuestion', { question: args.question });
    const lang = (args.language || 'en').substring(0,5).toLowerCase();
    const res = await askKB(args.question, lang);
    try {
      const call = args?.callSid ? await prisma.callLog.findUnique({ where: { callSid: String(args.callSid) } }) : null;
      await prisma.citationsLog.create({ data: { callLogId: call?.id || null, callSid: args?.callSid || null, question: args.question, language: lang, sources: JSON.stringify(res.sources || []) } });
    } catch {}
    return res;
  }
};
