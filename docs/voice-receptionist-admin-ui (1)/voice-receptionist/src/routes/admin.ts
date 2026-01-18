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

export default router;
