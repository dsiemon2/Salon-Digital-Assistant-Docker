import { Router } from 'express';
import { prisma } from '../db/prisma.js';

const router = Router();

function requireToken(req, res, next) {
  const token = req.query.token || req.body?.token || req.headers['x-admin-token'];
  if (!process.env.ADMIN_TOKEN) return res.status(500).send('ADMIN_TOKEN not set');
  if (token !== process.env.ADMIN_TOKEN) return res.status(401).send('Unauthorized');
  res.locals.token = token;
  next();
}

router.get('/admin', requireToken, async (_req, res) => {
  const cfg = await prisma.businessConfig.findFirst();
  const depts = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  res.render('admin/index', { cfg, depts, token: res.locals.token });
});

router.get('/admin/hours', requireToken, async (_req, res) => {
  const cfg = await prisma.businessConfig.findFirst();
  res.render('admin/hours', { cfg, token: res.locals.token });
});

router.post('/admin/hours', requireToken, async (req, res) => {
  const { address, hoursJson } = req.body;
  let hours = hoursJson;
  try { JSON.parse(hoursJson || '{}'); } catch { return res.status(400).send('hoursJson must be valid JSON'); }
  const existing = await prisma.businessConfig.findFirst();
  if (existing) {
    await prisma.businessConfig.update({ where: { id: existing.id }, data: { address, hoursJson: hours } });
  } else {
    await prisma.businessConfig.create({ data: { address, hoursJson: hours } });
  }
  res.redirect(`/admin?token=${encodeURIComponent(res.locals.token)}`);
});

router.get('/admin/departments', requireToken, async (_req, res) => {
  const depts = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  res.render('admin/departments', { depts, token: res.locals.token });
});

router.post('/admin/departments/add', requireToken, async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).send('name and phone required');
  await prisma.department.upsert({
    where: { name },
    update: { phone },
    create: { name, phone }
  });
  res.redirect(`/admin/departments?token=${encodeURIComponent(res.locals.token)}`);
});

router.post('/admin/departments/delete', requireToken, async (req, res) => {
  const { id } = req.body;
  if (id) await prisma.department.delete({ where: { id } }).catch(() => {});
  res.redirect(`/admin/departments?token=${encodeURIComponent(res.locals.token)}`);
});

router.get('/admin/calls', requireToken, async (_req, res) => {
  const calls = await prisma.callLog.findMany({ orderBy: { startedAt: 'desc' }, take: 100 });
  res.render('admin/calls', { calls, token: res.locals.token });
});


router.get('/admin/analytics', requireToken, async (_req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const calls = await prisma.callLog.findMany({ where: { startedAt: { gte: since } } });
  const intents = await prisma.intentLog.findMany({ where: { createdAt: { gte: since } } });

  const totalCalls = calls.length;
  const completed = calls.filter(c => c.outcome === 'completed').length;
  const transferred = intents.filter(i => i.intent === 'transferToHuman' || i.intent === 'transferToDepartment').length;
  const voicemails = calls.filter(c => c.outcome === 'busy' || c.outcome === 'no-answer').length; // approximation

  // Average handle time for calls with endedAt
  const handleDurations = calls.filter(c => c.endedAt).map(c => (new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime())/1000);
  const avgHandleSeconds = handleDurations.length ? Math.round(handleDurations.reduce((a,b)=>a+b,0)/handleDurations.length) : 0;

  // Top intents
  const counts: Record<string, number> = {};
  for (const i of intents) counts[i.intent] = (counts[i.intent] || 0) + 1;
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);

  res.render('admin/analytics', {
    token: res.locals.token,
    totalCalls, completed, transferred, voicemails, avgHandleSeconds, top
  });
});


router.get('/admin/analytics-pro', requireToken, async (_req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const calls = await prisma.callLog.findMany({ where: { startedAt: { gte: since } } });
  const intents = await prisma.intentLog.findMany({ where: { createdAt: { gte: since } } });

  // Index intents by CallSid from meta (if available)
  const intentsByCall: Record<string, string[]> = {};
  for (const i of intents) {
    let meta: any = {};
    try { meta = JSON.parse(i.meta); } catch {}
    const sid = meta?.callSid || 'unknown';
    if (!intentsByCall[sid]) intentsByCall[sid] = [];
    intentsByCall[sid].push(i.intent);
  }

  // Compute deflection: calls that used KB and did NOT transfer
  let kbCalls = 0, kbDeflected = 0;
  const transferIntents = new Set(['transferToHuman', 'transferToDepartment']);
  for (const c of calls) {
    const intentsForCall = intentsByCall[c.callSid] || [];
    const usedKB = intentsForCall.includes('answerQuestion');
    const transferred = intentsForCall.some(x => transferIntents.has(x));
    if (usedKB) kbCalls++;
    if (usedKB && !transferred && c.outcome === 'completed') kbDeflected++;
  }
  const deflectionPct = kbCalls ? Math.round((kbDeflected / kbCalls) * 100) : 0;

  // Per-intent counts
  const counts: Record<string, number> = {};
  for (const i of intents) counts[i.intent] = (counts[i.intent] || 0) + 1;
  const byIntent = Object.entries(counts).sort((a,b)=>b[1]-a[1]);

  res.render('admin/analytics_pro', {
    token: res.locals.token,
    kbCalls, kbDeflected, deflectionPct, byIntent
  });
});

export default router;
