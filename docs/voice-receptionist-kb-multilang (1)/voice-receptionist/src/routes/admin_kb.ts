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

router.get('/admin/kb', requireToken, async (_req, res) => {
  const docs = await prisma.knowledgeDoc.findMany({ orderBy: { createdAt: 'desc' } });
  res.render('admin/kb', { docs, token: res.locals.token });
});

router.get('/admin/kb/new', requireToken, async (_req, res) => {
  res.render('admin/kb_new', { token: res.locals.token });
});

router.post('/admin/kb/new', requireToken, async (req, res) => {
  const { title, language, content } = req.body || {};
  if (!title || !content) return res.status(400).send('title and content required');
  // create doc; chunks & embeddings indexed by API call from server on demand to avoid blocking here
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const doc = await prisma.knowledgeDoc.create({ data: { title, slug, language: (language || 'en'), content } });
  res.redirect(`/admin/kb?token=${encodeURIComponent(res.locals.token)}`);
});

router.post('/admin/kb/delete', requireToken, async (req, res) => {
  const { id } = req.body;
  if (id) await prisma.knowledgeDoc.delete({ where: { id } }).catch(()=>{});
  res.redirect(`/admin/kb?token=${encodeURIComponent(res.locals.token)}`);
});

export default router;
