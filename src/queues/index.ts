import { Queue } from 'bullmq';
import { getRedis } from '../session/redisClient.js';

// Lazy-load queues only when Redis is available
let _kbIndexQueue: Queue | null = null;
let _transcriptionQueue: Queue | null = null;

export function getKbIndexQueue(): Queue | null {
  const redis = getRedis();
  if (!_kbIndexQueue && redis) {
    _kbIndexQueue = new Queue('kb-index', { connection: redis });
  }
  return _kbIndexQueue;
}

export function getTranscriptionQueue(): Queue | null {
  const redis = getRedis();
  if (!_transcriptionQueue && redis) {
    _transcriptionQueue = new Queue('transcription', { connection: redis });
  }
  return _transcriptionQueue;
}

// For backwards compatibility - may be null if Redis unavailable
export const kbIndexQueue = { get queue() { return getKbIndexQueue(); } } as unknown as Queue;
export const transcriptionQueue = { get queue() { return getTranscriptionQueue(); } } as unknown as Queue;
