import { kbIndexQueue, transcribeQueue } from './index.js';

export async function enqueueKbIndex(payload: { docId?: string } = {}) {
  return kbIndexQueue.add('index-doc', payload, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
}

export async function enqueueTranscription(payload: { recordingUrl: string, callSid?: string }) {
  return transcribeQueue.add('transcribe', payload, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
}
