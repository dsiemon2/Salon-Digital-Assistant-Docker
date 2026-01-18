import twilio from 'twilio';
import pino from 'pino';

const logger = pino();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM_NUMBER = process.env.TWILIO_VOICE_NUMBER;
const MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

export interface SMSOptions {
  to: string;
  body: string;
  mediaUrl?: string[];
}

/**
 * Send an SMS message using Twilio
 */
export async function sendSMS(options: SMSOptions): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { to, body, mediaUrl } = options;

  // Validate phone number format
  const cleanPhone = to.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return { success: false, error: 'Invalid phone number' };
  }

  const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;

  try {
    const messageOptions: any = {
      to: formattedPhone,
      body,
    };

    // Use messaging service if configured, otherwise use from number
    if (MESSAGING_SERVICE_SID) {
      messageOptions.messagingServiceSid = MESSAGING_SERVICE_SID;
    } else if (FROM_NUMBER) {
      messageOptions.from = FROM_NUMBER;
    } else {
      return { success: false, error: 'No SMS sender configured' };
    }

    // Add media URL if provided (for MMS)
    if (mediaUrl && mediaUrl.length > 0) {
      messageOptions.mediaUrl = mediaUrl;
    }

    const message = await twilioClient.messages.create(messageOptions);

    logger.info({ sid: message.sid, to: formattedPhone }, 'SMS sent successfully');
    return { success: true, sid: message.sid };
  } catch (err: any) {
    logger.error({ err, to: formattedPhone }, 'Failed to send SMS');
    return { success: false, error: err.message };
  }
}

/**
 * Send appointment confirmation SMS
 */
export async function sendAppointmentConfirmation(options: {
  to: string;
  customerName: string;
  salonName: string;
  serviceName: string;
  stylistName: string;
  appointmentDate: string;
  appointmentTime: string;
  confirmationCode: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { to, customerName, salonName, serviceName, stylistName, appointmentDate, appointmentTime, confirmationCode } = options;

  const body = `Appointment Confirmed!

Hi ${customerName}!

Your appointment at ${salonName} is confirmed:
- Service: ${serviceName}
- Stylist: ${stylistName}
- Date: ${appointmentDate}
- Time: ${appointmentTime}
- Confirmation: ${confirmationCode}

Need to reschedule or cancel? Just call us back!

We can't wait to see you!`;

  return sendSMS({ to, body });
}

/**
 * Send appointment reminder SMS
 */
export async function sendAppointmentReminder(options: {
  to: string;
  customerName: string;
  salonName: string;
  serviceName: string;
  stylistName: string;
  appointmentDate: string;
  appointmentTime: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { to, customerName, salonName, serviceName, stylistName, appointmentDate, appointmentTime } = options;

  const body = `Hi ${customerName}!

Reminder: Your appointment at ${salonName} is coming up!

- Service: ${serviceName}
- Stylist: ${stylistName}
- Date: ${appointmentDate}
- Time: ${appointmentTime}

Need to reschedule? Please call us as soon as possible.

See you soon!`;

  return sendSMS({ to, body });
}

/**
 * Send cancellation confirmation SMS
 */
export async function sendCancellationConfirmation(options: {
  to: string;
  customerName: string;
  salonName: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { to, customerName, salonName, serviceName, appointmentDate, appointmentTime } = options;

  const body = `Hi ${customerName},

Your appointment at ${salonName} has been cancelled:
- Service: ${serviceName}
- Was scheduled: ${appointmentDate} at ${appointmentTime}

We hope to see you again soon! Call anytime to book a new appointment.

- ${salonName}`;

  return sendSMS({ to, body });
}

/**
 * Send reschedule confirmation SMS
 */
export async function sendRescheduleConfirmation(options: {
  to: string;
  customerName: string;
  salonName: string;
  serviceName: string;
  stylistName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { to, customerName, salonName, serviceName, stylistName, oldDate, oldTime, newDate, newTime } = options;

  const body = `Hi ${customerName}!

Your appointment at ${salonName} has been rescheduled:

Previous: ${oldDate} at ${oldTime}
New: ${newDate} at ${newTime}

- Service: ${serviceName}
- Stylist: ${stylistName}

See you then!`;

  return sendSMS({ to, body });
}

/**
 * Send voicemail notification SMS
 */
export async function sendVoicemailNotification(options: {
  to: string;
  callerPhone: string;
  transcript?: string;
  timestamp: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { to, callerPhone, transcript, timestamp } = options;

  let body = `New voicemail received!

From: ${callerPhone}
Time: ${timestamp}`;

  if (transcript) {
    body += `\n\nTranscript:\n"${transcript.substring(0, 300)}${transcript.length > 300 ? '...' : ''}"`;
  }

  body += `\n\nCheck the admin dashboard for full details.`;

  return sendSMS({ to, body });
}

/**
 * Send location/directions SMS
 */
export async function sendLocationSMS(options: {
  to: string;
  salonName: string;
  address: string;
  landmark?: string;
  mapsLink?: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { to, salonName, address, landmark, mapsLink } = options;

  let body = `${salonName}

Address: ${address}`;

  if (landmark) {
    body += `\n(Next to ${landmark})`;
  }

  if (mapsLink) {
    body += `\n\nMap: ${mapsLink}`;
  }

  body += `\n\nWe look forward to seeing you!`;

  return sendSMS({ to, body });
}

/**
 * Send callback request notification to admin
 */
export async function sendCallbackNotification(options: {
  to: string;
  customerName: string;
  customerPhone: string;
  reason?: string;
  preferredTime?: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { to, customerName, customerPhone, reason, preferredTime } = options;

  let body = `Callback Request

Customer: ${customerName}
Phone: ${customerPhone}`;

  if (reason) {
    body += `\nReason: ${reason}`;
  }

  if (preferredTime) {
    body += `\nPreferred time: ${preferredTime}`;
  }

  body += `\n\nPlease call back as soon as possible.`;

  return sendSMS({ to, body });
}

export default {
  sendSMS,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendCancellationConfirmation,
  sendRescheduleConfirmation,
  sendVoicemailNotification,
  sendLocationSMS,
  sendCallbackNotification
};
