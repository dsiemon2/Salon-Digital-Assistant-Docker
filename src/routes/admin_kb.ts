import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { enqueueKbIndex } from '../queues/enqueue.js';

const router = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.query.token || req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).render('admin/error', { message: 'Unauthorized' });
  }
  next();
}

// List KB articles
router.get('/admin/kb', requireAuth, async (req, res) => {
  const docs = await prisma.knowledgeDoc.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { chunks: true } } }
  });

  res.render('admin/kb', { token: req.query.token, docs });
});

// New article form
router.get('/admin/kb/new', requireAuth, (req, res) => {
  res.render('admin/kb_new', { token: req.query.token, doc: null });
});

// Edit article form
router.get('/admin/kb/:id/edit', requireAuth, async (req, res) => {
  const doc = await prisma.knowledgeDoc.findUnique({
    where: { id: req.params.id }
  });

  if (!doc) {
    return res.status(404).render('admin/error', { message: 'Article not found' });
  }

  res.render('admin/kb_new', { token: req.query.token, doc });
});

// Create article
router.post('/admin/kb', requireAuth, async (req, res) => {
  const { title, slug, language, content } = req.body;

  const doc = await prisma.knowledgeDoc.create({
    data: {
      title,
      slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
      language: language || 'en',
      content
    }
  });

  // Enqueue indexing
  await enqueueKbIndex({ docId: doc.id });

  res.redirect(`/admin/kb?token=${req.query.token}`);
});

// Update article
router.post('/admin/kb/:id', requireAuth, async (req, res) => {
  const { title, slug, language, content } = req.body;

  await prisma.knowledgeDoc.update({
    where: { id: req.params.id },
    data: { title, slug, language, content }
  });

  // Re-index
  await enqueueKbIndex({ docId: req.params.id });

  res.redirect(`/admin/kb?token=${req.query.token}`);
});

// Delete article
router.post('/admin/kb/:id/delete', requireAuth, async (req, res) => {
  await prisma.knowledgeDoc.delete({ where: { id: req.params.id } });
  res.redirect(`/admin/kb?token=${req.query.token}`);
});

export default router;
