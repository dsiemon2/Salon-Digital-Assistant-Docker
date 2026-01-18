import WebSocket, { WebSocketServer } from 'ws';
import type { Server } from 'http';
import pino from 'pino';
import { tools } from './toolRegistry.js';
import { prisma } from '../db/prisma.js';
import twilio from 'twilio';

const logger = pino();

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
  for (let i = 0; i < bytes.length; i++) out[i] = ulawDecodeSample(bytes[i]) | 0;
  return out;
}
function encodePCM16ToMuLaw(pcm16: Int16Array): string {
  const out = Buffer.alloc(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) out[i] = ulawEncodeSample(pcm16[i]);
  return out.toString('base64');
}
function upsample8kTo16k(pcm8k: Int16Array): Int16Array {
  const out = new Int16Array(pcm8k.length * 2);
  for (let i = 0; i < pcm8k.length - 1; i++) {
    const a = pcm8k[i], b = pcm8k[i + 1];
    out[2 * i] = a; out[2 * i + 1] = ((a + b) / 2) | 0;
  }
  out[out.length - 2] = pcm8k[pcm8k.length - 1];
  out[out.length - 1] = pcm8k[pcm8k.length - 1];
  return out;
}
function downsample16kTo8k(pcm16k: Int16Array): Int16Array {
  const out = new Int16Array(Math.floor(pcm16k.length / 2));
  for (let i = 0; i < out.length; i++) {
    const a = pcm16k[2 * i], b = pcm16k[2 * i + 1];
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
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

    let currentCallSid: string | null = null;

    const rtUrl = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview')}`;
    const openaiWS = new WebSocket(rtUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    function flushInput() {
      openaiWS.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      openaiWS.send(JSON.stringify({
        type: 'response.create',
        response: { modalities: ['text', 'audio'], instructions: 'You are a helpful receptionist. Use tools when appropriate.' }
      }));
    }

    openaiWS.on('open', () => {
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
            { name: 'transferToDepartment', description: 'Transfer caller to a named department', input_schema: { type: 'object', properties: { department: { type: 'string' } }, required: ['department'] } },
            { name: 'takeMessage', description: 'Take a message from the caller', input_schema: { type: 'object', properties: { subject: { type: 'string' }, details: { type: 'string' }, contact: { type: 'string' } } } },
            { name: 'bookAppointment', description: 'Book an appointment for the caller', input_schema: { type: 'object', properties: { dateTime: { type: 'string' }, purpose: { type: 'string' }, contact: { type: 'string' }, email: { type: 'string' }, durationMins: { type: 'number' } } } }
          ]
        }
      };
      openaiWS.send(JSON.stringify(sessionUpdate));
    });

    openaiWS.on('message', async (data) => {
      try {
        const evt = JSON.parse(data.toString());

        if (evt.type === 'response.audio.delta' && evt.delta) {
          const pcm16 = new Int16Array(Buffer.from(evt.delta, 'base64').buffer);
          const pcm8 = downsample16kTo8k(pcm16);
          const muLawB64 = encodePCM16ToMuLaw(pcm8);
          twilioWS.send(JSON.stringify({ event: 'media', media: { payload: muLawB64 } }));
        }

        // Handle tool calls directly here to enable server-side actions (transfer)
        if (evt.type === 'response.function_call' || evt.type === 'tool.call') {
          const name = evt.name || evt.tool_name;
          const args = typeof evt.arguments === 'string' ? JSON.parse(evt.arguments || '{}') : (evt.arguments || {});
          const toolCallId = evt.id || evt.tool_call_id;

          let result: any = { ok: false };
          try {
            if (name === 'transferToHuman') {
              // Perform live transfer using Twilio Call update (TwiML)
              if (!currentCallSid) throw new Error('No CallSid available for transfer');
              const target = process.env.TWILIO_AGENT_TRANSFER_NUMBER;
              if (!target) throw new Error('TWILIO_AGENT_TRANSFER_NUMBER not set');
              const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Connecting you to a live agent.</Say><Dial>${target}</Dial></Response>`;
              await client.calls(currentCallSid).update({ twiml });
              result = { ok: true, dialed: target, reason: args?.reason || 'unspecified' };

            if (name === 'transferToDepartment') {
              const fn: any = tools['transferToDepartment'];
              const r = await fn(args);
              if (r?.ok && r.phone) {
                // Update the live call to dial the department
                if (!currentCallSid) throw new Error('No CallSid available for transfer');
                const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Connecting you to ${r.department}.</Say><Dial>${r.phone}</Dial></Response>`;
                await client.calls(currentCallSid).update({ twiml });
              }
              // Also log intent with CallSid
              try { await prisma.intentLog.create({ data: { intent: 'transferToDepartment', meta: JSON.stringify({ department: args?.department, callSid: currentCallSid }) } }); } catch {}
              result = r;
            } else 
            } else if (name === 'bookAppointment' || name === 'takeMessage' || name === 'getBusinessHours') {
              // Delegate to local tools for everything else
              // @ts-ignore
              const fn = tools[name];
              result = await fn(args);
            } else {
              result = { ok: false, error: `Unknown tool ${name}` };
            }
          } catch (e: any) {
            result = { ok: false, error: e.message };
          }

          openaiWS.send(JSON.stringify({
            type: 'tool.output',
            tool_call_id: toolCallId,
            output: JSON.stringify(result)
          }));
        }
      } catch (e) {
        // swallow parse errors
      }
    });

    twilioWS.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        switch (msg.event) {
          case 'start':
            // Twilio usually includes CallSid in the start message
            currentCallSid = msg?.start?.callSid || msg?.streamSid || null;
            break;
          case 'media': {
            const b64MuLaw: string = msg.media?.payload || '';
            const pcm8 = decodeMuLawToPCM16(b64MuLaw);
            const pcm16 = upsample8kTo16k(pcm8);
            openaiWS.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: Buffer.from(pcm16.buffer).toString('base64')
            }));
            break;
          }
          case 'stop':
            flushInput();
            break;
        }
      } catch (e) {
        // ignore
      }
    });

    twilioWS.on('close', () => {
      try { openaiWS.close(); } catch {}
    });
  });
}
