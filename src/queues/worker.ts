import 'dotenv/config';
import { Worker } from 'bullmq';
import pino from 'pino';
import { redis } from '../session/redisClient.js';
import { indexDocument } from '../services/kb.js';
import { prisma } from '../db/prisma.js';
import OpenAI from 'openai';

const logger = pino();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// KB Index Worker
const kbWorker = new Worker(
  'kb-index',
  async (job) => {
    logger.info({ docId: job.data.docId }, 'Indexing KB document');
    const result = await indexDocument(job.data.docId);
    logger.info({ docId: job.data.docId, result }, 'KB document indexed');
    return result;
  },
  { connection: redis }
);

kbWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'KB index job completed');
});

kbWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'KB index job failed');
});

// Transcription Worker
const transcriptionWorker = new Worker(
  'transcription',
  async (job) => {
    const { recordingUrl, callSid } = job.data;
    logger.info({ callSid }, 'Processing transcription');

    if (!recordingUrl) {
      logger.warn('No recording URL provided');
      return { ok: false, error: 'No recording URL' };
    }

    try {
      // Fetch recording from Twilio (requires auth)
      const authHeader = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64');

      const response = await fetch(recordingUrl, {
        headers: { Authorization: `Basic ${authHeader}` }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recording: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();

      // Transcribe with Whisper
      const file = new File(
        [audioBuffer],
        'recording.wav',
        { type: 'audio/wav' }
      );

      const transcription = await openai.audio.transcriptions.create({
        file,
        model: process.env.OPENAI_STT_MODEL || 'whisper-1',
      });

      // Save to database
      if (callSid) {
        const callLog = await prisma.callLog.findUnique({
          where: { callSid }
        });

        if (callLog) {
          await prisma.message.create({
            data: {
              callLogId: callLog.id,
              type: 'voicemail',
              body: transcription.text,
            }
          });
        }
      }

      logger.info({ callSid, text: transcription.text }, 'Transcription completed');
      return { ok: true, text: transcription.text };
    } catch (err: any) {
      logger.error({ err, callSid }, 'Transcription failed');
      return { ok: false, error: err.message };
    }
  },
  { connection: redis }
);

transcriptionWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Transcription job completed');
});

transcriptionWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Transcription job failed');
});

logger.info('Workers started: kb-index, transcription');
