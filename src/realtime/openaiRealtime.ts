import WebSocket from 'ws';
import pino from 'pino';

const logger = pino();

export type ToolSpec = {
  name: string;
  description?: string;
  input_schema: Record<string, any>;
};

export type OpenAIRealtimeOptions = {
  model?: string;
  apiKey?: string;
  voice?: string;
  inputSampleRate?: number;
  outputSampleRate?: number;
  turnDetection?: 'server_vad' | 'none';
  tools?: ToolSpec[];
  instructions?: string;
};

export type ToolCallEvent = {
  id?: string;
  name?: string;
  tool_name?: string;
  arguments?: string | Record<string, any>;
  tool_call_id?: string;
};

export type Handlers = {
  onAudioDelta?: (b64Pcm16_16k: string) => void;
  onTextDelta?: (textChunk: string) => void;
  onResponseCompleted?: () => void;
  onToolCall?: (call: ToolCallEvent) => Promise<any>;
  onError?: (err: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export class OpenAIRealtimeClient {
  private ws?: WebSocket;
  private opts: Required<OpenAIRealtimeOptions>;
  private handlers: Handlers;
  private connected = false;
  private pendingBytes = 0;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(opts: OpenAIRealtimeOptions = {}, handlers: Handlers = {}) {
    this.opts = {
      model: opts.model || process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview',
      apiKey: opts.apiKey || process.env.OPENAI_API_KEY || '',
      voice: opts.voice || process.env.OPENAI_TTS_VOICE || 'alloy',
      inputSampleRate: opts.inputSampleRate ?? 16000,
      outputSampleRate: opts.outputSampleRate ?? 16000,
      turnDetection: opts.turnDetection || 'server_vad',
      tools: opts.tools || [],
      instructions: opts.instructions || `You are an AI salon receptionist — friendly, confident, warm, and efficient.

Your Personality & Tone:
- Warm, welcoming, and upbeat
- Polished and professional (like a high-end salon receptionist)
- Efficient with answers, never robotic
- Minimal small talk; stay on task
- Slightly cheerful, with a smile in your voice

Your Primary Goals:
1. Booking appointments correctly (your #1 job)
2. Answering common questions fast (pricing, hours, location)
3. Screening calls (spam, vendors, unrelated calls)
4. Protecting stylists' time
5. Upselling salon add-ons when appropriate
6. Collecting callback info accurately
7. Routing emergencies properly (e.g., cancellations within 24 hours)

When Booking Appointments:
1. Ask which service they would like
2. Ask if they have a preferred stylist (or first available)
3. Ask for preferred date and time (morning/afternoon)
4. Check availability and offer options
5. Collect customer name and phone number
6. Confirm all details before booking
7. Offer to send a text confirmation

For Reschedules/Cancellations:
- Ask for name or phone number to look up the appointment
- For cancellations within 24 hours, mention the cancellation policy
- Confirm the change and offer to rebook

Edge Cases:
- Spam/Sales calls: Politely decline and end the call
- Confused callers: Clarify their intent gently
- Unavailable service: Suggest the closest matching service
- Rude callers: Stay professional, set boundaries

IMPORTANT: Never use emojis in your responses - this is a voice call and emojis cannot be spoken.
When a caller asks a general question, use the answerQuestion tool and briefly cite the source.`,
    };
    this.handlers = handlers;

    if (!this.opts.apiKey) {
      throw new Error('OpenAIRealtimeClient: OPENAI_API_KEY missing.');
    }
  }

  connect() {
    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(this.opts.model)}`;
    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${this.opts.apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    this.ws.on('open', () => {
      this.connected = true;
      this.send({
        type: 'session.update',
        session: {
          input_audio_format: { type: 'pcm16', sample_rate: this.opts.inputSampleRate },
          output_audio_format: { type: 'pcm16', sample_rate: this.opts.outputSampleRate },
          turn_detection: this.opts.turnDetection === 'server_vad'
            ? { type: 'server_vad' }
            : { type: 'none' },
          voice: this.opts.voice,
          tools: this.opts.tools,
          instructions: this.opts.instructions,
        },
      });
      this.startHeartbeat();
      this.handlers.onOpen?.();
      logger.info('OpenAI Realtime: connected');
    });

    this.ws.on('message', (data: WebSocket.RawData) => {
      try {
        const evt = JSON.parse(data.toString());
        this.routeEvent(evt);
      } catch (e: any) {
        logger.warn({ err: e }, 'OpenAI Realtime: failed to parse message');
      }
    });

    this.ws.on('close', () => {
      this.connected = false;
      this.stopHeartbeat();
      this.handlers.onClose?.();
      logger.info('OpenAI Realtime: closed');
    });

    this.ws.on('error', (err) => {
      this.handlers.onError?.(err as any);
      logger.error({ err }, 'OpenAI Realtime: error');
    });
  }

  close() {
    try {
      this.stopHeartbeat();
      this.ws?.close();
    } catch {}
    this.connected = false;
  }

  updateSession(patch: Record<string, any>) {
    this.send({ type: 'session.update', session: patch });
  }

  appendAudioBase64(b64Pcm16_16k: string) {
    if (!this.connected) return;
    const payload = { type: 'input_audio_buffer.append', audio: b64Pcm16_16k };
    this.pendingBytes += Buffer.byteLength(b64Pcm16_16k, 'base64');
    this.send(payload);
  }

  commitAndRespond(modalities: Array<'text' | 'audio'> = ['text', 'audio']) {
    if (!this.connected) return;
    this.send({ type: 'input_audio_buffer.commit' });
    this.send({ type: 'response.create', response: { modalities } });
    this.pendingBytes = 0;
  }

  maybeAutoFlush(thresholdBytes = 32000) {
    if (this.pendingBytes >= thresholdBytes) {
      this.commitAndRespond(['text', 'audio']);
    }
  }

  private send(obj: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(obj));
  }

  private routeEvent(evt: any) {
    if (evt.type === 'response.audio.delta' && evt.delta) {
      this.handlers.onAudioDelta?.(evt.delta);
      return;
    }

    if (evt.type === 'response.output_text.delta' && evt.delta) {
      this.handlers.onTextDelta?.(evt.delta);
      return;
    }

    if (evt.type === 'response.completed') {
      this.handlers.onResponseCompleted?.();
      return;
    }

    if (evt.type === 'response.function_call' || evt.type === 'tool.call') {
      const call: ToolCallEvent = {
        id: evt.id,
        name: evt.name,
        tool_name: evt.tool_name,
        arguments: evt.arguments,
        tool_call_id: evt.tool_call_id,
      };
      void this.handleToolCall(call);
      return;
    }
  }

  private async handleToolCall(call: ToolCallEvent) {
    const name = call.name || call.tool_name;
    const args = typeof call.arguments === 'string'
      ? safeParseJson(call.arguments)
      : (call.arguments || {});
    const toolCallId = call.tool_call_id || call.id;

    let output: any = { ok: false, error: `Unhandled tool ${name}` };
    try {
      if (this.handlers.onToolCall) {
        output = await this.handlers.onToolCall({ ...call, arguments: args });
      }
    } catch (e: any) {
      output = { ok: false, error: e?.message || String(e) };
    }

    this.send({
      type: 'tool.output',
      tool_call_id: toolCallId,
      output: JSON.stringify(output),
    });
  }

  private startHeartbeat(intervalMs = 20000) {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      try {
        if (this.connected) {
          this.send({ type: 'session.update', session: { keepalive_at: Date.now() } });
        }
      } catch {}
    }, intervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}

function safeParseJson(s?: string) {
  if (!s) return {};
  try { return JSON.parse(s); } catch { return {}; }
}
