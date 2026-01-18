import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pino from 'pino';
import http from 'http';
import healthRouter from './routes/health.js';
import twilioWebhook from './routes/twilioWebhook.js';
import { attachMediaServer } from './realtime/mediaServer.js';

const app = express();
const logger = pino();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false })); // Twilio sends application/x-www-form-urlencoded
app.use(bodyParser.json());

app.use('/healthz', healthRouter);
app.use('/', twilioWebhook);

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const server = http.createServer(app);

// Attach WS media server for Twilio Media Streams
attachMediaServer(server);

server.listen(port, () => {
  logger.info(`Voice receptionist running on :${port}`);
});
