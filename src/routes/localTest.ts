import { Router } from 'express';
import { WebSocket } from 'ws';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prisma.js';
import { toolSpecs, handleToolCall } from '../realtime/toolRegistry.js';

const logger = pino();
const router = Router();

// Serve the local test page
router.get('/test', (req, res) => {
  res.render('test');
});

// API endpoint to log test calls
router.post('/api/test-call-log', async (req, res) => {
  try {
    const { startedAt, endedAt, transcript, outcome, callerName, duration } = req.body;

    // Create call log
    const callLog = await prisma.callLog.create({
      data: {
        callSid: 'test-' + uuidv4(),
        fromNumber: '+15550001234',
        toNumber: '+15550009999',
        callerName: callerName || null,
        duration: duration || null,
        startedAt: new Date(startedAt),
        endedAt: endedAt ? new Date(endedAt) : null,
        outcome: outcome || 'completed'
      }
    });

    // Create transcript entries
    if (transcript && Array.isArray(transcript)) {
      for (const entry of transcript) {
        await prisma.transcript.create({
          data: {
            callLogId: callLog.id,
            text: `[${entry.role}]: ${entry.text}`
          }
        });
      }
    }

    logger.info({ callId: callLog.id }, 'Test call logged');
    res.json({ success: true, callId: callLog.id });
  } catch (err: any) {
    logger.error({ err }, 'Failed to log test call');
    res.status(500).json({ success: false, error: err.message });
  }
});

// Handle local test WebSocket connections
export function handleLocalTestConnection(clientWs: WebSocket) {
  logger.info('Local test client connected');

  let openaiWs: WebSocket | null = null;
  let pendingUserTranscript: string | null = null;
  let bufferedAssistantTranscript: string[] = [];
  let isWaitingForUserTranscript = false;

  try {
    // Connect to OpenAI Realtime API
    openaiWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      }
    );

    openaiWs.on('open', () => {
      logger.info('Connected to OpenAI Realtime API');

      // Configure the session
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are an AI salon receptionist — friendly, confident, warm, and efficient.

Your Personality & Tone:
- Warm, welcoming, and upbeat
- Polished and professional (like a high-end salon receptionist)
- Efficient with answers, never robotic
- Minimal small talk; stay on task
- Slightly cheerful, with a smile in your voice

Your Primary Goals:
1. Booking appointments correctly (your #1 job)
2. Answering common questions fast (pricing, hours, location)
3. Screening calls appropriately
4. Upselling salon add-ons when appropriate

When Booking Appointments:
1. Ask which service they would like
2. Ask if they have a preferred stylist (or first available)
3. Ask for preferred date and time
4. Check availability and offer options
5. Collect customer name and phone number
6. Confirm all details before booking

IMPORTANT: Never use emojis in your responses - this is a voice call and emojis cannot be spoken.`,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          tools: toolSpecs.map(spec => ({
            type: 'function',
            name: spec.name,
            description: spec.description,
            parameters: spec.input_schema
          }))
        }
      };

      openaiWs!.send(JSON.stringify(sessionConfig));

      // Notify client we're ready
      clientWs.send(JSON.stringify({ type: 'ready' }));

      // Send initial greeting after session is configured
      setTimeout(async () => {
        if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
          // Fetch greeting from database
          const config = await prisma.businessConfig.findFirst();
          const greeting = config?.greeting || 'Thank you for calling XYZ Salon! This is your AI assistant. How can I help you today?';

          logger.info({ greeting }, 'Sending greeting to OpenAI');
          openaiWs.send(JSON.stringify({
            type: 'response.create',
            response: {
              modalities: ['text', 'audio'],
              instructions: `Say exactly: "${greeting}"`
            }
          }));
        }
      }, 500);
    });

    openaiWs.on('message', async (data) => {
      try {
        const event = JSON.parse(data.toString());
        if (event.type === 'response.done' || event.type === 'error') {
          logger.info({ type: event.type, response: event.response, error: event.error }, 'OpenAI event');
        } else {
          logger.info({ type: event.type }, 'OpenAI event');
        }

        switch (event.type) {
          case 'input_audio_buffer.speech_started':
            // User started speaking - prepare to buffer assistant response
            isWaitingForUserTranscript = true;
            bufferedAssistantTranscript = [];
            break;

          case 'response.audio.delta':
            // Forward audio to client immediately
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'audio',
                audio: event.delta
              }));
            }
            break;

          case 'response.audio_transcript.delta':
            // Buffer transcript if waiting for user transcription, otherwise send immediately
            if (isWaitingForUserTranscript) {
              bufferedAssistantTranscript.push(event.delta);
            } else if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'assistant_transcript',
                text: event.delta
              }));
            }
            break;

          case 'conversation.item.input_audio_transcription.completed':
            // User's speech transcribed - send user message first, then buffered assistant
            if (clientWs.readyState === WebSocket.OPEN) {
              // Send user transcript
              clientWs.send(JSON.stringify({
                type: 'user_transcript',
                text: event.transcript
              }));
              // Now send any buffered assistant transcript
              if (bufferedAssistantTranscript.length > 0) {
                clientWs.send(JSON.stringify({
                  type: 'assistant_transcript',
                  text: bufferedAssistantTranscript.join('')
                }));
                bufferedAssistantTranscript = [];
              }
            }
            isWaitingForUserTranscript = false;
            break;

          case 'response.function_call_arguments.done':
            // Handle tool call
            logger.info({ name: event.name }, 'Tool call received');
            try {
              const args = JSON.parse(event.arguments || '{}');
              const result = await handleToolCall(event.name, args, event.call_id);

              if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
                openaiWs.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: event.call_id,
                    output: JSON.stringify(result)
                  }
                }));

                openaiWs.send(JSON.stringify({
                  type: 'response.create'
                }));
              }
            } catch (err: any) {
              logger.error({ err, name: event.name }, 'Tool call failed');
            }
            break;

          case 'error':
            logger.error({ error: event.error }, 'OpenAI error');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'error',
                message: event.error?.message || 'Unknown error'
              }));
            }
            break;
        }
      } catch (err) {
        logger.error({ err }, 'Error processing OpenAI message');
      }
    });

    openaiWs.on('error', (err) => {
      logger.error({ err }, 'OpenAI WebSocket error');
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'error', message: 'OpenAI connection error' }));
      }
    });

    openaiWs.on('close', () => {
      logger.info('OpenAI connection closed');
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    });

  } catch (err) {
    logger.error({ err }, 'Error setting up OpenAI connection');
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'error', message: 'Failed to connect to OpenAI' }));
    }
  }

  // Handle messages from client
  clientWs.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'audio' && openaiWs && openaiWs.readyState === WebSocket.OPEN) {
        // Forward audio to OpenAI
        openaiWs.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: message.audio
        }));
      } else if (message.type === 'text' && openaiWs && openaiWs.readyState === WebSocket.OPEN) {
        // Send text message
        openaiWs.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: message.text }]
          }
        }));
        openaiWs.send(JSON.stringify({ type: 'response.create' }));
      }
    } catch (err) {
      logger.error({ err }, 'Error processing client message');
    }
  });

  clientWs.on('close', () => {
    logger.info('Local test client disconnected');
    if (openaiWs) {
      openaiWs.close();
    }
  });

  clientWs.on('error', (err) => {
    logger.error({ err }, 'Client WebSocket error');
    if (openaiWs) {
      openaiWs.close();
    }
  });
}

export default router;
