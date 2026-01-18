import { Worker, Job } from 'bullmq';
import { KB_INDEX_QUEUE, TRANSCRIBE_QUEUE, connection } from './index.js';
import { indexDbDocs } from '../services/kb.js';
import fetch from 'node-fetch';
import { prisma } from '../db/prisma.js';

// KB Index Worker
new Worker(KB_INDEX_QUEUE, async (job: Job) => {
  const { docId } = job.data || {};
  return await indexDbDocs(docId);
}, { connection });

// Transcription Worker (example): fetch audio & store transcript placeholder
new Worker(TRANSCRIBE_QUEUE, async (job: Job) => {
  const { recordingUrl, callSid } = job.data || {};
  if (!recordingUrl) return { ok: false, error: 'NO_URL' };
  // NOTE: For secured Twilio recordings, you must use Basic Auth with your SID/token or pre-signed URLs.
  // This worker demonstrates where you'd fetch audio, send to STT (if needed), and save results.
  try {
    // const res = await fetch(recordingUrl); const buf = await res.arrayBuffer();
    await prisma.message.create({ data: { callLogId: null, subject: 'Voicemail', body: `Recording at ${recordingUrl}`, notified: false } });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}, { connection });

console.log('Workers running for KB Index & Transcription queues.');
