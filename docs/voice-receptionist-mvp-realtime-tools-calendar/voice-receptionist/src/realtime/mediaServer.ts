import WebSocket, { WebSocketServer } from 'ws';
import type { Server } from 'http';
import pino from 'pino';
import { tools } from './toolRegistry.js';

const logger = pino();

/** μ-law (G.711) decode/encode adapted for Node buffers.
 * Twilio payload: base64 μ-law, 8kHz mono
 * OpenAI Realtime expects 16kHz PCM16 mono (base64)
 */

function ulawDecodeSample(uVal: number): number {
  uVal = ~uVal;
  const sign = (uVal & 0x80) ? -1 : 1;
  let exponent = (uVal >> 4) & 0x07;
  let mantissa = uVal & 0x0F;
  let magnitude = ((mantissa << 1) + 1) << (exponent + 2);
  magnitude -= 132;
  return sign * magnitude;
}

function ulawEncodeSample(sample: number): number {
  // clip
  const MAX = 32635;
  let s = Math.max(-MAX, Math.min(MAX, sample));
  const sign = (s < 0) ? 0x80 : 0x00;
  if (s < 0) s = -s;
  s += 132;
  let exponent = 7;
  for (let expMask = 0x4000; (s & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}
  const mantissa = (s >> (exponent + 3)) & 0x0F;
  const uVal = ~(sign | (exponent << 4) | mantissa) & 0xFF;
  return uVal;
}

function decodeMuLawToPCM16(muLawB64: string): Int16Array {
  if (!muLawB64) return new Int16Array(0);
  const bytes = Buffer.from(muLawB64, 'base64');
  const out = new Int16Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = ulawDecodeSample(bytes[i]) | 0;
  }
  return out;
}

function encodePCM16ToMuLaw(pcm16: Int16Array): string {
  const out = Buffer.alloc(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    out[i] = ulawEncodeSample(pcm16[i]);
  }
  return out.toString('base64');
}

/** Resample 8k->16k using naive linear interpolation */
function upsample8kTo16k(pcm8k: Int16Array): Int16Array {
  const out = new Int16Array(pcm8k.length * 2);
  for (let i = 0; i < pcm8k.length - 1; i++) {
    const a = pcm8k[i];
    const b = pcm8k[i + 1];
    out[2 * i] = a;
    out[2 * i + 1] = ((a + b) / 2) | 0;
  }
  out[out.length - 2] = pcm8k[pcm8k.length - 1];
  out[out.length - 1] = pcm8k[pcm8k.length - 1];
  return out;
}

/** Downsample 16k->8k by simple averaging of pairs */
function downsample16kTo8k(pcm16k: Int16Array): Int16Array {
  const out = new Int16Array(Math.floor(pcm16k.length / 2));
  for (let i = 0; i < out.length; i++) {
    const a = pcm16k[2 * i];
    const b = pcm16k[2 * i + 1];
    out[i] = ((a + b) / 2) | 0;
  }
  return out;
}

export function attachMediaServer(httpServer: Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url && request.url.startsWith('/media')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (twilioWS: WebSocket) => {
    logger.info('Twilio Media Stream connected');

    const rtUrl = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview')}`;
    const openaiWS = new WebSocket(rtUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    // For batching audio appends
    let pendingAudioBytes = 0;

    function flushInput() {
      openaiWS.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      openaiWS.send(JSON.stringify({
        type: 'response.create',
        response: { modalities: ['text', 'audio'], instructions: 'You are a helpful receptionist. Use tools when appropriate.' }
      }));
      pendingAudioBytes = 0;
    }

    openaiWS.on('open', () => {
      logger.info('OpenAI Realtime WS connected');
      const sessionUpdate = {
        type: 'session.update',
        session: {
          input_audio_format: { type: 'pcm16', sample_rate: 16000 },
          output_audio_format: { type: 'pcm16', sample_rate: 16000 },
          turn_detection: { type: 'server_vad' },
          voice: process.env.OPENAI_TTS_VOICE || 'alloy',
          tools: [
            { name: 'getBusinessHours', description: 'Get business hours and address', input_schema: { type: 'object', properties: {} } },
            { name: 'transferToHuman', description: 'Transfer caller to a human', input_schema: { type: 'object', properties: { reason: { type: 'string' } } } },
            { name: 'takeMessage', description: 'Take a message from the caller', input_schema: { type: 'object', properties: { subject: { type: 'string' }, details: { type: 'string' }, contact: { type: 'string' } } } },
            { name: 'bookAppointment', description: 'Book an appointment for the caller', input_schema: { type: 'object', properties: { dateTime: { type: 'string' }, purpose: { type: 'string' }, contact: { type: 'string' }, email: { type: 'string' } } } }
          ]
        }
      };
      openaiWS.send(JSON.stringify(sessionUpdate));
    });

    // Handle OpenAI events (audio + tool-calls)
    openaiWS.on('message', async (data) => {
      try {
        const evt = JSON.parse(data.toString());

        // Audio streaming back to Twilio
        if (evt.type === 'response.audio.delta' && evt.delta) {
          // evt.delta is base64 PCM16 16k mono
          const pcm16 = new Int16Array(Buffer.from(evt.delta, 'base64').buffer);
          const pcm8 = downsample16kTo8k(pcm16);
          const muLawB64 = encodePCM16ToMuLaw(pcm8);
          const frame = { event: 'media', media: { payload: muLawB64 } };
          twilioWS.send(JSON.stringify(frame));
        }

        // Tool calls (generic handler for tool events)
        if (evt.type === 'response.function_call' || evt.type === 'tool.call') {
          const name = evt.name || evt.tool_name;
          const args = typeof evt.arguments === 'string' ? JSON.parse(evt.arguments || '{}') : (evt.arguments || {});
          const toolCallId = evt.id || evt.tool_call_id;

          if (name && tools[name as keyof typeof tools]) {
            let result: any;
            try {
              // Execute local tool
              // @ts-ignore
              result = await tools[name](args);
            } catch (e) {
              result = { ok: false, error: (e as Error).message };
            }
            // Send result back
            const out = {
              type: 'tool.output',
              tool_call_id: toolCallId,
              output: JSON.stringify(result)
            };
            openaiWS.send(JSON.stringify(out));
          }
        }
      } catch (e) {
        logger.warn({ err: e }, 'Failed to parse OpenAI message');
      }
    });

    openaiWS.on('close', () => logger.info('OpenAI Realtime WS closed'));
    openaiWS.on('error', (err) => logger.error({ err }, 'OpenAI WS error'));

    // Twilio frames
    twilioWS.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        switch (msg.event) {
          case 'start':
            logger.info({ start: msg.start }, 'Stream start');
            break;
          case 'media': {
            const b64MuLaw: string = msg.media?.payload || '';
            const pcm8 = decodeMuLawToPCM16(b64MuLaw);
            const pcm16 = upsample8kTo16k(pcm8);
            const append = {
              type: 'input_audio_buffer.append',
              audio: Buffer.from(pcm16.buffer).toString('base64')
            };
            pendingAudioBytes += pcm16.byteLength;
            openaiWS.send(JSON.stringify(append));

            // backpressure / periodic flush
            if (pendingAudioBytes > 32000) {
              flushInput();
            }
            break;
          }
          case 'mark':
            break;
          case 'stop': {
            flushInput();
            break;
          }
          default:
            break;
        }
      } catch (e) {
        logger.warn({ err: e }, 'Failed to parse Twilio frame');
      }
    });

    twilioWS.on('close', () => {
      logger.info('Twilio Media Stream closed');
      try { openaiWS.close(); } catch {}
    });
  });
}
