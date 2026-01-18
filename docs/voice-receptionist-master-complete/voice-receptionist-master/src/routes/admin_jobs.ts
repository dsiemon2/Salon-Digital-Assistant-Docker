import { Router } from 'express';
import { kbIndexQueue, transcribeQueue } from '../queues/index.js';

const router = Router();

function requireToken(req, res, next) {
  const token = req.query.token || req.body?.token || req.headers['x-admin-token'];
  if (!process.env.ADMIN_TOKEN) return res.status(500).send('ADMIN_TOKEN not set');
  if (token !== process.env.ADMIN_TOKEN) return res.status(401).send('Unauthorized');
  res.locals.token = token;
  next();
}

router.get('/admin/jobs', requireToken, async (_req, res) => {
  const queues = [kbIndexQueue, transcribeQueue];
  const rows = [];
  for (const q of queues) {
    const counts = await q.getJobCounts('waiting','active','completed','failed','delayed');
    const failed = await q.getJobs(['failed'], 0, 50);
    rows.push({ name: q.name, counts, failed: failed.map(j => ({ id: j.id, name: j.name, attemptsMade: j.attemptsMade, failedReason: j.failedReason })) });
  }
  res.render('admin/jobs', { token: res.locals.token, rows });
});

export default router;
