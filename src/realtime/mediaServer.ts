import { WebSocket } from 'ws';
import pino from 'pino';
import { OpenAIRealtimeClient } from './openaiRealtime.js';
import { tools, toolSpecs } from './toolRegistry.js';
import { prisma } from '../db/prisma.js';

const logger = pino();

// μ-law to linear PCM16 conversion table (8-bit μ-law -> 16-bit linear)
const MULAW_DECODE_TABLE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  let sample = ~i;
  const sign = sample & 0x80;
  const exponent = (sample >> 4) & 0x07;
  const mantissa = sample & 0x0f;
  let magnitude = (mantissa << 4) + 8;
  if (exponent !== 0) {
    magnitude += 0x100;
    magnitude <<= exponent - 1;
  }
  MULAW_DECODE_TABLE[i] = sign !== 0 ? -magnitude : magnitude;
}

// Linear PCM16 to μ-law conversion
function linearToMulaw(sample: number): number {
  const MULAW_MAX = 0x1fff;
  const MULAW_BIAS = 33;

  const sign = sample < 0 ? 0x80 : 0;
  if (sign) sample = -sample;
  if (sample > MULAW_MAX) sample = MULAW_MAX;
  sample += MULAW_BIAS;

  let exponent = 7;
  for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1);

  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  return ~(sign | (exponent << 4) | mantissa) & 0xff;
}

// Decode μ-law buffer to PCM16 buffer
function decodeMulaw(mulawBuffer: Buffer): Buffer {
  const pcm = Buffer.alloc(mulawBuffer.length * 2);
  for (let i = 0; i < mulawBuffer.length; i++) {
    const sample = MULAW_DECODE_TABLE[mulawBuffer[i]];
    pcm.writeInt16LE(sample, i * 2);
  }
  return pcm;
}

// Encode PCM16 buffer to μ-law buffer
function encodeMulaw(pcmBuffer: Buffer): Buffer {
  const mulaw = Buffer.alloc(pcmBuffer.length / 2);
  for (let i = 0; i < mulaw.length; i++) {
    const sample = pcmBuffer.readInt16LE(i * 2);
    mulaw[i] = linearToMulaw(sample);
  }
  return mulaw;
}

// Simple resampler 8k -> 16k (linear interpolation)
function upsample8kTo16k(buffer: Buffer): Buffer {
  const inputSamples = buffer.length / 2;
  const output = Buffer.alloc(inputSamples * 4);

  for (let i = 0; i < inputSamples - 1; i++) {
    const sample1 = buffer.readInt16LE(i * 2);
    const sample2 = buffer.readInt16LE((i + 1) * 2);
    output.writeInt16LE(sample1, i * 4);
    output.writeInt16LE(Math.round((sample1 + sample2) / 2), i * 4 + 2);
  }

  // Last sample
  const lastSample = buffer.readInt16LE((inputSamples - 1) * 2);
  output.writeInt16LE(lastSample, (inputSamples - 1) * 4);
  output.writeInt16LE(lastSample, (inputSamples - 1) * 4 + 2);

  return output;
}

// Simple resampler 16k -> 8k (decimation)
function downsample16kTo8k(buffer: Buffer): Buffer {
  const inputSamples = buffer.length / 2;
  const output = Buffer.alloc(inputSamples);

  for (let i = 0; i < inputSamples / 2; i++) {
    const sample = buffer.readInt16LE(i * 4);
    output.writeInt16LE(sample, i * 2);
  }

  return output;
}

export function handleMediaConnection(twilioWs: WebSocket) {
  logger.info('Twilio Media Stream connected');

  let streamSid: string | null = null;
  let callSid: string | null = null;
  let openaiClient: OpenAIRealtimeClient | null = null;

  // Helper to create OpenAI client with voice from database
  async function initializeOpenAIClient() {
    // Fetch selected voice from database
    const config = await prisma.businessConfig.findFirst();
    const voice = config?.selectedVoice || process.env.OPENAI_TTS_VOICE || 'alloy';

    logger.info({ voice }, 'Initializing OpenAI Realtime with voice');

    openaiClient = new OpenAIRealtimeClient(
      { tools: toolSpecs, voice },
      {
        onAudioDelta: (b64Pcm16_16k: string) => {
          // Convert base64 PCM16 16k to μ-law 8k and send to Twilio
          try {
            const pcm16k = Buffer.from(b64Pcm16_16k, 'base64');
            const pcm8k = downsample16kTo8k(pcm16k);
            const mulaw = encodeMulaw(pcm8k);

            if (twilioWs.readyState === WebSocket.OPEN && streamSid) {
              twilioWs.send(JSON.stringify({
                event: 'media',
                streamSid,
                media: { payload: mulaw.toString('base64') }
              }));
            }
          } catch (err) {
            logger.error({ err }, 'Error sending audio to Twilio');
          }
        },
        onToolCall: async (call) => {
          const toolName = call.name || call.tool_name;
          if (!toolName) {
            return { ok: false, error: 'No tool name provided' };
          }
          const args = typeof call.arguments === 'string'
            ? JSON.parse(call.arguments || '{}')
            : (call.arguments || {});

          // Add callSid to args if available
          if (callSid) {
            args.callSid = callSid;
          }

          logger.info({ toolName, args }, 'Tool call received');

          // Execute the tool
          const toolFn = (tools as Record<string, Function>)[toolName];
          if (toolFn) {
            try {
              const result = await toolFn(args);
              logger.info({ toolName, result }, 'Tool call completed');
              return result;
            } catch (err: any) {
              logger.error({ err, toolName }, 'Tool execution failed');
              return { ok: false, error: err.message || 'Tool execution failed' };
            }
          } else {
            return { ok: false, error: `Unknown tool: ${toolName}` };
          }
        },
        onOpen: () => {
          logger.info('OpenAI Realtime connected');
        },
        onClose: () => {
          logger.info('OpenAI Realtime disconnected');
        },
        onError: (err) => {
          logger.error({ err }, 'OpenAI Realtime error');
        }
      }
    );

    openaiClient.connect();
  }

  // Initialize OpenAI client immediately (fetches voice from DB)
  initializeOpenAIClient().catch(err => {
    logger.error({ err }, 'Failed to initialize OpenAI client');
  });

  twilioWs.on('message', (data: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.event) {
        case 'connected':
          logger.info('Twilio stream connected');
          break;

        case 'start':
          streamSid = msg.start?.streamSid;
          callSid = msg.start?.callSid;
          logger.info({ streamSid, callSid }, 'Twilio stream started');
          break;

        case 'media':
          // Decode μ-law 8k audio from Twilio
          if (msg.media?.payload && openaiClient) {
            const mulaw = Buffer.from(msg.media.payload, 'base64');
            const pcm8k = decodeMulaw(mulaw);
            const pcm16k = upsample8kTo16k(pcm8k);

            // Send to OpenAI Realtime
            openaiClient.appendAudioBase64(pcm16k.toString('base64'));
          }
          break;

        case 'stop':
          logger.info('Twilio stream stopped');
          break;

        default:
          // Ignore other events
          break;
      }
    } catch (err) {
      logger.error({ err }, 'Error processing Twilio message');
    }
  });

  twilioWs.on('close', () => {
    logger.info('Twilio WebSocket closed');
    openaiClient?.close();
  });

  twilioWs.on('error', (err) => {
    logger.error({ err }, 'Twilio WebSocket error');
    openaiClient?.close();
  });
}
