import { getKbIndexQueue, getTranscriptionQueue } from './index.js';

export async function enqueueKbIndex(data: { docId: string }) {
  const queue = getKbIndexQueue();
  if (!queue) {
    console.log('[Queue] Redis not available, skipping KB index job');
    return;
  }
  await queue.add('index', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
}

export async function enqueueTranscription(data: { recordingUrl?: string; callSid?: string }) {
  const queue = getTranscriptionQueue();
  if (!queue) {
    console.log('[Queue] Redis not available, skipping transcription job');
    return;
  }
  await queue.add('transcribe', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
}
