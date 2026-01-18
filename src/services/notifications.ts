import pino from 'pino';

const logger = pino();

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export interface SlackMessage {
  text: string;
  channel?: string;
  username?: string;
  icon_emoji?: string;
  attachments?: SlackAttachment[];
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: { title: string; value: string; short?: boolean }[];
  footer?: string;
  ts?: number;
}

/**
 * Send a notification to Slack
 */
export async function sendSlackNotification(message: SlackMessage): Promise<{ success: boolean; error?: string }> {
  if (!SLACK_WEBHOOK_URL) {
    logger.debug('Slack webhook not configured, skipping notification');
    return { success: true }; // Don't fail if not configured
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message.text,
        username: message.username || 'Salon Receptionist',
        icon_emoji: message.icon_emoji || ':scissors:',
        attachments: message.attachments
      })
    });

    if (!response.ok) {
      throw new Error(`Slack returned ${response.status}`);
    }

    logger.info('Slack notification sent');
    return { success: true };
  } catch (err: any) {
    logger.error({ err }, 'Failed to send Slack notification');
    return { success: false, error: err.message };
  }
}

/**
 * Notify about a new call
 */
export async function notifyNewCall(options: {
  callSid: string;
  fromNumber: string;
  callerName?: string;
}): Promise<void> {
  await sendSlackNotification({
    text: `New call received`,
    attachments: [{
      color: '#0dcaf0',
      fields: [
        { title: 'From', value: options.fromNumber, short: true },
        { title: 'Caller', value: options.callerName || 'Unknown', short: true },
        { title: 'Call SID', value: options.callSid.substring(0, 20) + '...', short: false }
      ],
      footer: 'AI Salon Receptionist',
      ts: Math.floor(Date.now() / 1000)
    }]
  });
}

/**
 * Notify about a new appointment booked
 */
export async function notifyAppointmentBooked(options: {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  stylistName?: string;
  appointmentDate: string;
  appointmentTime: string;
  confirmationCode: string;
}): Promise<void> {
  await sendSlackNotification({
    text: `New appointment booked!`,
    icon_emoji: ':calendar:',
    attachments: [{
      color: '#198754',
      title: `${options.serviceName} Appointment`,
      fields: [
        { title: 'Customer', value: options.customerName, short: true },
        { title: 'Phone', value: options.customerPhone, short: true },
        { title: 'Service', value: options.serviceName, short: true },
        { title: 'Stylist', value: options.stylistName || 'First Available', short: true },
        { title: 'Date', value: options.appointmentDate, short: true },
        { title: 'Time', value: options.appointmentTime, short: true },
        { title: 'Confirmation', value: options.confirmationCode, short: false }
      ],
      footer: 'AI Salon Receptionist',
      ts: Math.floor(Date.now() / 1000)
    }]
  });
}

/**
 * Notify about an appointment cancellation
 */
export async function notifyAppointmentCancelled(options: {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  stylistName?: string;
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
}): Promise<void> {
  await sendSlackNotification({
    text: `Appointment cancelled`,
    icon_emoji: ':x:',
    attachments: [{
      color: '#dc3545',
      title: `Cancelled: ${options.serviceName}`,
      fields: [
        { title: 'Customer', value: options.customerName, short: true },
        { title: 'Phone', value: options.customerPhone, short: true },
        { title: 'Service', value: options.serviceName, short: true },
        { title: 'Stylist', value: options.stylistName || 'N/A', short: true },
        { title: 'Was scheduled', value: `${options.appointmentDate} at ${options.appointmentTime}`, short: false },
        { title: 'Reason', value: options.reason || 'Not specified', short: false }
      ],
      footer: 'AI Salon Receptionist',
      ts: Math.floor(Date.now() / 1000)
    }]
  });
}

/**
 * Notify about an appointment reschedule
 */
export async function notifyAppointmentRescheduled(options: {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  stylistName?: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
}): Promise<void> {
  await sendSlackNotification({
    text: `Appointment rescheduled`,
    icon_emoji: ':arrows_counterclockwise:',
    attachments: [{
      color: '#ffc107',
      title: `Rescheduled: ${options.serviceName}`,
      fields: [
        { title: 'Customer', value: options.customerName, short: true },
        { title: 'Phone', value: options.customerPhone, short: true },
        { title: 'Service', value: options.serviceName, short: true },
        { title: 'Stylist', value: options.stylistName || 'First Available', short: true },
        { title: 'Old Time', value: `${options.oldDate} at ${options.oldTime}`, short: true },
        { title: 'New Time', value: `${options.newDate} at ${options.newTime}`, short: true }
      ],
      footer: 'AI Salon Receptionist',
      ts: Math.floor(Date.now() / 1000)
    }]
  });
}

/**
 * Notify about a callback request
 */
export async function notifyCallbackRequest(options: {
  customerName: string;
  customerPhone: string;
  reason?: string;
  preferredTime?: string;
}): Promise<void> {
  await sendSlackNotification({
    text: `Callback requested`,
    icon_emoji: ':phone:',
    attachments: [{
      color: '#0d6efd',
      title: 'Callback Request',
      fields: [
        { title: 'Customer', value: options.customerName, short: true },
        { title: 'Phone', value: options.customerPhone, short: true },
        { title: 'Reason', value: options.reason || 'Not specified', short: false },
        { title: 'Preferred Time', value: options.preferredTime || 'ASAP', short: true }
      ],
      footer: 'AI Salon Receptionist',
      ts: Math.floor(Date.now() / 1000)
    }]
  });
}

/**
 * Notify about a new voicemail
 */
export async function notifyVoicemail(options: {
  fromNumber: string;
  duration: number;
  transcript?: string;
}): Promise<void> {
  await sendSlackNotification({
    text: `New voicemail received!`,
    icon_emoji: ':mailbox_with_mail:',
    attachments: [{
      color: '#6c757d',
      title: 'Voicemail',
      fields: [
        { title: 'From', value: options.fromNumber, short: true },
        { title: 'Duration', value: `${options.duration} seconds`, short: true },
        { title: 'Transcript', value: options.transcript?.substring(0, 500) || 'Transcription pending...', short: false }
      ],
      footer: 'AI Salon Receptionist',
      ts: Math.floor(Date.now() / 1000)
    }]
  });
}

/**
 * Notify about a call transfer request
 */
export async function notifyTransferRequest(options: {
  fromNumber: string;
  callerName?: string;
  reason?: string;
}): Promise<void> {
  await sendSlackNotification({
    text: `Call transfer requested - caller wants to speak with staff`,
    icon_emoji: ':telephone_receiver:',
    attachments: [{
      color: '#dc3545',
      title: 'Transfer Request',
      fields: [
        { title: 'Caller', value: options.callerName || 'Unknown', short: true },
        { title: 'Phone', value: options.fromNumber, short: true },
        { title: 'Reason', value: options.reason || 'Not specified', short: false }
      ],
      footer: 'AI Salon Receptionist',
      ts: Math.floor(Date.now() / 1000)
    }]
  });
}

/**
 * Notify about an error/alert
 */
export async function notifyError(options: {
  title: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  context?: Record<string, string>;
}): Promise<void> {
  const colors = {
    warning: '#ffc107',
    error: '#dc3545',
    critical: '#7c0a02'
  };

  const emojis = {
    warning: ':warning:',
    error: ':x:',
    critical: ':rotating_light:'
  };

  const fields = Object.entries(options.context || {}).map(([key, value]) => ({
    title: key,
    value,
    short: true
  }));

  await sendSlackNotification({
    text: `${emojis[options.severity]} ${options.title}`,
    icon_emoji: emojis[options.severity],
    attachments: [{
      color: colors[options.severity],
      title: options.title,
      text: options.message,
      fields,
      footer: 'AI Salon Receptionist',
      ts: Math.floor(Date.now() / 1000)
    }]
  });
}

/**
 * Send daily summary notification
 */
export async function notifyDailySummary(options: {
  date: string;
  totalCalls: number;
  appointmentsBooked: number;
  appointmentsCancelled: number;
  voicemails: number;
  callbackRequests: number;
  transferRequests: number;
}): Promise<void> {
  await sendSlackNotification({
    text: `Daily Summary for ${options.date}`,
    icon_emoji: ':bar_chart:',
    attachments: [{
      color: '#0d6efd',
      title: 'Daily Summary',
      fields: [
        { title: 'Total Calls', value: options.totalCalls.toString(), short: true },
        { title: 'Appointments Booked', value: options.appointmentsBooked.toString(), short: true },
        { title: 'Appointments Cancelled', value: options.appointmentsCancelled.toString(), short: true },
        { title: 'Voicemails', value: options.voicemails.toString(), short: true },
        { title: 'Callback Requests', value: options.callbackRequests.toString(), short: true },
        { title: 'Transfer Requests', value: options.transferRequests.toString(), short: true }
      ],
      footer: 'AI Salon Receptionist',
      ts: Math.floor(Date.now() / 1000)
    }]
  });
}

export default {
  sendSlackNotification,
  notifyNewCall,
  notifyAppointmentBooked,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
  notifyCallbackRequest,
  notifyVoicemail,
  notifyTransferRequest,
  notifyError,
  notifyDailySummary
};
