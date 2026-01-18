import { Router } from 'express';
import twilio from 'twilio';
import { prisma } from '../db/prisma.js';
import { enqueueTranscription } from '../queues/enqueue.js';

const router = Router();
const { VoiceResponse } = twilio.twiml;

// Main voice entry point
router.post('/voice', async (_req, res) => {
  const twiml = new VoiceResponse();
  const config = await prisma.businessConfig.findFirst();
  const salonName = config?.salonName || 'XYZ Salon';

  twiml.say({ voice: 'Polly.Joanna' },
    `Thank you for calling ${salonName}! This call may be recorded. How can I help you today?`
  );

  const gather = twiml.gather({
    input: 'speech dtmf',
    numDigits: 1,
    speechTimeout: 'auto',
    action: '/voice/route',
    method: 'POST',
  });

  gather.say({ voice: 'Polly.Joanna' },
    'Press 1 to book an appointment. ' +
    'Press 2 for pricing information. ' +
    'Press 3 for hours and location. ' +
    'Press 0 to speak with someone. ' +
    'Or press 9 for our voice assistant.'
  );

  res.type('text/xml').send(twiml.toString());
});

// Route based on DTMF or speech input
router.post('/voice/route', async (req, res) => {
  const twiml = new VoiceResponse();
  const { Digits, SpeechResult } = req.body || {};
  const slot = (Digits || '').trim();
  const speech = (SpeechResult || '').toLowerCase();
  const config = await prisma.businessConfig.findFirst();
  const salonName = config?.salonName || 'XYZ Salon';

  // Voice Assistant (AI conversation)
  if (slot === '9' || /assistant|ai|voice|help/i.test(speech)) {
    const connect = twiml.connect();
    const baseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '') || '';
    connect.stream({ url: `${baseUrl}/media` });
    twiml.say({ voice: 'Polly.Joanna' },
      'Connecting you to our voice assistant. One moment please.'
    );
    res.type('text/xml').send(twiml.toString());
    return;
  }

  // Book Appointment
  if (slot === '1' || /book|appointment|schedule|reserve/i.test(speech)) {
    twiml.say({ voice: 'Polly.Joanna' },
      'To book an appointment, press 9 to speak with our AI assistant who can check availability and book for you. ' +
      `You can also book online at ${salonName.toLowerCase().replace(/\s+/g, '')} dot com.`
    );
    twiml.redirect('/voice');
    res.type('text/xml').send(twiml.toString());
    return;
  }

  // Pricing Information
  if (slot === '2' || /price|pricing|cost|how much/i.test(speech)) {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { category: 'asc' },
      take: 5
    });

    if (services.length > 0) {
      const serviceList = services.map(s =>
        `${s.name} ${s.priceVaries ? 'starting at' : ''} $${s.price}`
      ).join('. ');

      twiml.say({ voice: 'Polly.Joanna' },
        `Here are some of our popular services: ${serviceList}. ` +
        'For a complete price list, press 9 to speak with our assistant or visit our website.'
      );
    } else {
      twiml.say({ voice: 'Polly.Joanna' },
        'For pricing information, press 9 to speak with our assistant or visit our website.'
      );
    }
    twiml.redirect('/voice');
    res.type('text/xml').send(twiml.toString());
    return;
  }

  // Hours and Location
  if (slot === '3' || /hour|hours|location|address|where|when|open|close/i.test(speech)) {
    const address = config?.address || '123 Main Street';
    const landmark = config?.landmark ? `, ${config.landmark}` : '';

    let hoursText = 'Tuesday through Saturday, 9 AM to 7 PM';
    if (config?.hoursJson) {
      try {
        const hours = JSON.parse(config.hoursJson);
        const entries = Object.entries(hours);
        if (entries.length > 0) {
          hoursText = entries.map(([day, time]) => `${day}: ${time}`).join('. ');
        }
      } catch {}
    }

    twiml.say({ voice: 'Polly.Joanna' },
      `We are located at ${address}${landmark}. ` +
      `Our hours are ${hoursText}. ` +
      'We are closed Sunday and Monday. ' +
      'Would you like me to text you the address? Press 9 to speak with our assistant.'
    );
    twiml.redirect('/voice');
    res.type('text/xml').send(twiml.toString());
    return;
  }

  // Transfer to Human
  if (slot === '0' || /human|person|agent|talk|speak|someone|transfer/i.test(speech)) {
    twiml.say({ voice: 'Polly.Joanna' }, 'Transferring you now. Please hold.');
    if (process.env.TWILIO_AGENT_TRANSFER_NUMBER) {
      twiml.dial(process.env.TWILIO_AGENT_TRANSFER_NUMBER);
    } else {
      twiml.say({ voice: 'Polly.Joanna' },
        'I\'m sorry, our stylists are currently with guests. ' +
        'Please leave a message after the tone, and we\'ll call you back as soon as possible.'
      );
      twiml.record({
        maxLength: 120,
        playBeep: true,
        transcribe: true,
        transcribeCallback: '/voice/voicemail',
        finishOnKey: '#'
      });
    }
    res.type('text/xml').send(twiml.toString());
    return;
  }

  // Voicemail
  if (/message|voicemail|leave/i.test(speech)) {
    twiml.say({ voice: 'Polly.Joanna' },
      'Please leave your message after the tone. Press pound when finished.'
    );
    twiml.record({
      maxLength: 120,
      playBeep: true,
      transcribe: true,
      transcribeCallback: '/voice/voicemail',
      finishOnKey: '#'
    });
    res.type('text/xml').send(twiml.toString());
    return;
  }

  // Cancel/Reschedule
  if (/cancel|reschedule|change/i.test(speech)) {
    twiml.say({ voice: 'Polly.Joanna' },
      'To cancel or reschedule an appointment, press 9 to speak with our assistant, ' +
      'or call us during business hours. Please note our cancellation policy requires 24 hours notice.'
    );
    twiml.redirect('/voice');
    res.type('text/xml').send(twiml.toString());
    return;
  }

  // Default - didn't understand
  twiml.say({ voice: 'Polly.Joanna' }, 'Sorry, I didn\'t catch that.');
  twiml.redirect('/voice');
  res.type('text/xml').send(twiml.toString());
});

// Voicemail callback
router.post('/voice/voicemail', async (req, res) => {
  console.log('Voicemail received:', req.body?.TranscriptionText);

  try {
    await enqueueTranscription({
      recordingUrl: req.body?.RecordingUrl,
      callSid: req.body?.CallSid
    });
  } catch (err) {
    console.error('Failed to enqueue transcription:', err);
  }

  const twiml = new VoiceResponse();
  twiml.say({ voice: 'Polly.Joanna' },
    'Thank you! Your message has been received. We\'ll get back to you soon.'
  );
  twiml.hangup();
  res.type('text/xml').send(twiml.toString());
});

// Call status webhook
router.post('/voice/status', async (req, res) => {
  const { CallSid, From, To, CallStatus } = req.body || {};

  // Upsert call log
  let call = await prisma.callLog.findUnique({
    where: { callSid: CallSid || '' }
  });

  if (!call) {
    try {
      call = await prisma.callLog.create({
        data: {
          callSid: CallSid || 'unknown',
          fromNumber: From || 'unknown',
          toNumber: To || 'unknown',
        }
      });
    } catch (err) {
      console.error('Failed to create call log:', err);
    }
  }

  // Update on call end
  const endedStatuses = new Set(['completed', 'busy', 'no-answer', 'canceled', 'failed']);
  if (CallStatus && endedStatuses.has(String(CallStatus))) {
    await prisma.callLog.update({
      where: { callSid: CallSid },
      data: { endedAt: new Date(), outcome: String(CallStatus) }
    }).catch(() => {});
  }

  res.status(204).end();
});

export default router;
