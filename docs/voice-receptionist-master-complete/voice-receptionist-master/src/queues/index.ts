import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

export const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const KB_INDEX_QUEUE = 'kb-index';
export const TRANSCRIBE_QUEUE = 'transcription';

export const kbIndexQueue = new Queue(KB_INDEX_QUEUE, { connection });
export const transcribeQueue = new Queue(TRANSCRIBE_QUEUE, { connection });
