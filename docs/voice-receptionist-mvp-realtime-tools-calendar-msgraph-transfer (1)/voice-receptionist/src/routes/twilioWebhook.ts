import { Router } from 'express';
import twilio from 'twilio';

const router = Router();
const { VoiceResponse } = twilio.twiml;

router.post('/voice', async (_req, res) => {
  const twiml = new VoiceResponse();

  twiml.say({ voice: 'alice' }, 'Hi! This call may be recorded for quality. How can I help today?');
  const gather = twiml.gather({
    input: 'speech dtmf',
    numDigits: 1,
    speechTimeout: 'auto',
    action: '/voice/route',
    method: 'POST',
  });
  gather.say({ voice: 'alice' }, 'Press 1 for hours and directions. Press 2 to leave a message. Press 3 for a live agent. Press 9 for the experimental voice assistant.');
  res.type('text/xml').send(twiml.toString());
});

router.post('/voice/route', async (req, res) => {
  const twiml = new VoiceResponse();
  const { Digits, SpeechResult } = req.body || {};

  const slot = (Digits || '').trim();
  if (slot === '9' || /assistant|ai|voice/i.test(SpeechResult || '')) {
    // Experimental realtime path using Media Streams
    const connect = twiml.connect();
    // Twilio Stream - your account must have Streams enabled (bidirectional varies by region)
    connect.stream({ url: `${process.env.PUBLIC_BASE_URL?.replace(/\/$/, '')}/media` });
    twiml.say({ voice: 'alice' }, 'Connecting you to our assistant. If you do not hear audio, the classic menu is available by hanging up and calling again.');
    res.type('text/xml').send(twiml.toString());
    return;
  }

  if (slot === '1' || /hours|directions/i.test(SpeechResult || '')) {
    twiml.say({ voice: 'alice' }, 'We are open Monday to Friday, 9 A M to 6 P M. Our address is 123 Main Street.');
    twiml.hangup();
  } else if (slot === '2' || /message|voicemail/i.test(SpeechResult || '')) {
    twiml.say({ voice: 'alice' }, 'Please leave your message after the tone. Press the pound key when finished.');
    twiml.record({
      maxLength: 120,
      playBeep: true,
      transcribe: true,
      transcribeCallback: '/voice/voicemail',
      finishOnKey: '#'
    });
  } else if (slot === '3' || /agent|human|transfer/i.test(SpeechResult || '')) {
    twiml.say({ voice: 'alice' }, 'Transferring you now.');
    if (!process.env.TWILIO_AGENT_TRANSFER_NUMBER) {
      twiml.say({ voice: 'alice' }, 'Sorry, no agent is configured.');
      twiml.hangup();
    } else {
      twiml.dial(process.env.TWILIO_AGENT_TRANSFER_NUMBER);
    }
  } else {
    twiml.say({ voice: 'alice' }, "Sorry, I didn't catch that.");
    twiml.redirect('/voice');
  }

  res.type('text/xml').send(twiml.toString());
});

router.post('/voice/voicemail', async (req, res) => {
  // Twilio sends TranscriptionText, RecordingUrl, From, To, CallSid
  console.log('Voicemail transcription:', req.body?.TranscriptionText);
  const twiml = new VoiceResponse();
  twiml.say({ voice: 'alice' }, 'Thanks! Your message has been received.');
  twiml.hangup();
  res.type('text/xml').send(twiml.toString());
});

export default router;
