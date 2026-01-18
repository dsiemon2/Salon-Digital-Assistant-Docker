import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pino from 'pino';
import adminRouter from './routes/admin.js';
import adminKbRouter from './routes/admin_kb.js';

const app = express();
const logger = pino();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve static files (favicon, etc.)
app.use(express.static('public'));

app.set('views', 'views');
app.set('view engine', 'ejs');

// Health check endpoint
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Admin Routes
app.use('/', adminRouter);
app.use('/', adminKbRouter);

const adminPort = process.env.ADMIN_PORT ? Number(process.env.ADMIN_PORT) : 8011;

app.listen(adminPort, () => {
  logger.info(`Admin UI running on :${adminPort}`);
  logger.info(`Dashboard: http://localhost:${adminPort}/admin?token=${process.env.ADMIN_TOKEN || 'local-dev-token'}`);
});
