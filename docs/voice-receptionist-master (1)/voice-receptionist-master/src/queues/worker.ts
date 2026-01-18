import { Worker, Job } from 'bullmq';
import { KB_INDEX_QUEUE, TRANSCRIBE_QUEUE, connection } from './index.js';
import { indexDbDocs } from '../services/kb.js';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { prisma } from '../db/prisma.js';

// KB Index Worker
new Worker(KB_INDEX_QUEUE, async (job: Job) => {
  const { docId } = job.data || {};
  return await indexDbDocs(docId);
}, { connection });

// Transcription Worker: fetch Twilio recording & transcribe via OpenAI
new Worker(TRANSCRIBE_QUEUE, async (job: Job) => {
  const { recordingUrl, callSid } = job.data || {};
  if (!recordingUrl) return { ok: false, error: 'NO_URL' };
  // NOTE: For secured Twilio recordings, you must use Basic Auth with your SID/token or pre-signed URLs.
  // This worker demonstrates where you'd fetch audio, send to STT (if needed), and save results.
  try {
    const user = process.env.TWILIO_ACCOUNT_SID || '';
    const pass = process.env.TWILIO_AUTH_TOKEN || '';
    const res = await fetch(recordingUrl + '.wav', { headers: { 'Authorization': 'Basic ' + Buffer.from(user + ':' + pass).toString('base64') } });
    if (!res.ok) throw new Error('Failed to fetch recording: ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());

    const fd: any = new FormData();
    fd.append('file', buf, { filename: 'audio.wav', contentType: 'audio/wav' });
    fd.append('model', process.env.OPENAI_STT_MODEL || 'whisper-1');

    const tr = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }, body: fd as any
    });
    if (!tr.ok) throw new Error('OpenAI STT failed: ' + tr.status + ' ' + (await tr.text()));
    const data = await tr.json();
    const text = data.text || '(no text)';

    await prisma.message.create({ data: { callLogId: null, subject: 'Voicemail', body: text, notified: false } });
    return { ok: true, text };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}, { connection });

console.log('Workers running for KB Index & Transcription queues.');
