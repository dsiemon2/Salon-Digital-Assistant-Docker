import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pino from 'pino';
import http from 'http';
import healthRouter from './routes/health.js';
import twilioWebhook from './routes/twilioWebhook.js';
import adminRouter from './routes/admin.js';
import adminKbRouter from './routes/admin_kb.js';
import { attachMediaServer } from './realtime/mediaServer.js';

const app = express();
const logger = pino();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false })); // Twilio sends application/x-www-form-urlencoded
app.use(bodyParser.json());

app.set('views', 'views');
app.set('view engine', 'ejs');
app.use('/healthz', healthRouter);
app.use('/', twilioWebhook);
app.use('/', adminRouter);
app.use('/', adminKbRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const server = http.createServer(app);

// Attach WS media server for Twilio Media Streams
attachMediaServer(server);

server.listen(port, () => {
  logger.info(`Voice receptionist running on :${port}`);
});
