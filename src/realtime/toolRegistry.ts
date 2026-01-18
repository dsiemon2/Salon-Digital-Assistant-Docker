import { prisma } from '../db/prisma.js';
import { askKB } from '../services/kb.js';
import { sendSMS, sendAppointmentConfirmation, sendAppointmentReminder, sendCancellationConfirmation } from '../services/sms.js';
import { notifyAppointmentBooked, notifyAppointmentCancelled, notifyTransferRequest, notifyCallbackRequest } from '../services/notifications.js';

// Generate a unique confirmation code
function generateConfirmationCode(): string {
  return 'APT-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Format time for display (e.g., "2:30 PM")
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Format date for display (e.g., "Tuesday, March 15th")
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// Parse time string to Date object for a given day
function parseTimeToDate(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

async function logIntent(intent: string, meta: any = {}) {
  try {
    await prisma.intentLog.create({ data: { intent, meta: JSON.stringify(meta) } });
  } catch {}
}

export const tools = {
  /**
   * Get policy/configuration settings
   */
  async getPolicy() {
    const cfg = await prisma.businessConfig.findFirst();
    return {
      kbMinConfidence: cfg?.kbMinConfidence ?? 0.55,
      lowConfidenceAction: cfg?.lowConfidenceAction ?? 'ask_clarify',
      salonName: cfg?.salonName ?? 'Our Salon',
      cancellationPolicy: cfg?.cancellationPolicy ?? 24
    };
  },

  /**
   * Set conversation language
   */
  async setLanguage(args: { lang: string }) {
    const lang = (args?.lang || 'en').substring(0, 5).toLowerCase();
    try {
      await prisma.languageLog.create({ data: { language: lang } });
    } catch {}
    await logIntent('setLanguage', { lang });
    return { ok: true, lang };
  },

  /**
   * Get salon services and pricing
   */
  async getServicePricing(args?: { category?: string; serviceName?: string }) {
    await logIntent('getServicePricing', args);

    const services = await prisma.service.findMany({
      where: {
        active: true,
        ...(args?.category ? { category: args.category } : {}),
        ...(args?.serviceName ? { name: { contains: args.serviceName } } : {})
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }]
    });

    if (services.length === 0) {
      return { ok: false, message: 'No services found matching your criteria' };
    }

    // Group by category
    const grouped: Record<string, any[]> = {};
    for (const s of services) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push({
        name: s.name,
        price: s.priceVaries ? `$${s.price}+` : `$${s.price}`,
        duration: `${s.duration} minutes`,
        description: s.description
      });
    }

    return {
      ok: true,
      services: grouped,
      message: 'Here are our services and prices'
    };
  },

  /**
   * Get list of available stylists
   */
  async getStylistInfo(args?: { stylistName?: string }) {
    await logIntent('getStylistInfo', args);

    const stylists = await prisma.stylist.findMany({
      where: {
        active: true,
        ...(args?.stylistName ? { name: { contains: args.stylistName } } : {})
      },
      include: {
        availability: true,
        services: { include: { service: true } }
      }
    });

    if (stylists.length === 0) {
      return {
        ok: true,
        message: 'All of our stylists are professionally trained and specialize in modern cuts and color. Would you like the first available appointment?'
      };
    }

    const stylistList = stylists.map(s => ({
      name: s.name,
      specialties: s.specialties ? JSON.parse(s.specialties) : [],
      bio: s.bio,
      acceptingNew: s.acceptingNew,
      services: s.services.map(ss => ss.service.name)
    }));

    return { ok: true, stylists: stylistList };
  },

  /**
   * Check availability for appointments
   */
  async checkAvailability(args: {
    serviceId?: string;
    serviceName?: string;
    stylistId?: string;
    stylistName?: string;
    preferredDate?: string;
    preferredTime?: string; // morning, afternoon, or specific time
  }) {
    await logIntent('checkAvailability', args);

    // Find service
    let service = null;
    if (args.serviceId) {
      service = await prisma.service.findUnique({ where: { id: args.serviceId } });
    } else if (args.serviceName) {
      service = await prisma.service.findFirst({
        where: { name: { contains: args.serviceName }, active: true }
      });
    }

    // Find stylist if specified
    let stylist = null;
    if (args.stylistId) {
      stylist = await prisma.stylist.findUnique({ where: { id: args.stylistId } });
    } else if (args.stylistName) {
      stylist = await prisma.stylist.findFirst({
        where: { name: { contains: args.stylistName }, active: true }
      });
    }

    // Parse preferred date
    let targetDate = new Date();
    if (args.preferredDate) {
      const parsed = new Date(args.preferredDate);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }

    // Get business config for hours
    const config = await prisma.businessConfig.findFirst();
    const closedDays = config?.closedDays ? JSON.parse(config.closedDays) : ['Sunday', 'Monday'];
    const hours = config?.hoursJson ? JSON.parse(config.hoursJson) : {};

    // Check next 7 days for availability
    const availableSlots: Array<{ date: string; time: string; stylist?: string }> = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7 && availableSlots.length < 5; i++) {
      const checkDate = new Date(targetDate);
      checkDate.setDate(checkDate.getDate() + i);
      const dayName = dayNames[checkDate.getDay()];

      // Skip closed days
      if (closedDays.includes(dayName)) continue;

      // Get hours for this day
      const dayHours = hours[dayName];
      if (!dayHours) continue;

      // Parse hours (e.g., "9:00 AM - 7:00 PM")
      let startHour = 9, endHour = 19;
      if (typeof dayHours === 'string') {
        const match = dayHours.match(/(\d+):?(\d*)\s*(AM|PM)?\s*-\s*(\d+):?(\d*)\s*(AM|PM)?/i);
        if (match) {
          startHour = parseInt(match[1]) + (match[3]?.toUpperCase() === 'PM' && parseInt(match[1]) !== 12 ? 12 : 0);
          endHour = parseInt(match[4]) + (match[6]?.toUpperCase() === 'PM' && parseInt(match[4]) !== 12 ? 12 : 0);
        }
      } else if (typeof dayHours === 'object') {
        startHour = parseInt(dayHours.start?.split(':')[0] || '9');
        endHour = parseInt(dayHours.end?.split(':')[0] || '19');
      }

      // Generate time slots (every 30 min)
      const serviceDuration = service?.duration || 30;
      for (let hour = startHour; hour < endHour; hour++) {
        for (const min of [0, 30]) {
          const slotTime = new Date(checkDate);
          slotTime.setHours(hour, min, 0, 0);

          // Skip past times
          if (slotTime < new Date()) continue;

          // Filter by preferred time
          if (args.preferredTime) {
            const pt = args.preferredTime.toLowerCase();
            if (pt === 'morning' && hour >= 12) continue;
            if (pt === 'afternoon' && (hour < 12 || hour >= 17)) continue;
            if (pt === 'evening' && hour < 17) continue;
          }

          // Check for conflicts with existing appointments
          const slotEnd = new Date(slotTime.getTime() + serviceDuration * 60000);
          const conflict = await prisma.appointment.findFirst({
            where: {
              status: { in: ['confirmed'] },
              ...(stylist ? { stylistId: stylist.id } : {}),
              appointmentDate: {
                gte: slotTime,
                lt: slotEnd
              }
            }
          });

          if (!conflict) {
            availableSlots.push({
              date: formatDate(slotTime),
              time: formatTime(slotTime),
              stylist: stylist?.name
            });

            if (availableSlots.length >= 5) break;
          }
        }
        if (availableSlots.length >= 5) break;
      }
    }

    if (availableSlots.length === 0) {
      return {
        ok: false,
        message: 'I couldn\'t find any available slots in the next week. Would you like me to check further out, or try a different stylist?'
      };
    }

    return {
      ok: true,
      slots: availableSlots,
      service: service?.name,
      stylist: stylist?.name,
      message: `I found some openings. Would you like to book one of these times?`
    };
  },

  /**
   * Book an appointment
   */
  async bookAppointment(args: {
    serviceName: string;
    stylistName?: string;
    preferredDate: string;
    preferredTime: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    notes?: string;
    addOns?: string[];
    callSid?: string;
  }) {
    await logIntent('bookAppointment', {
      service: args.serviceName,
      stylist: args.stylistName,
      date: args.preferredDate,
      time: args.preferredTime
    });

    // Find service
    const service = await prisma.service.findFirst({
      where: { name: { contains: args.serviceName }, active: true }
    });

    if (!service) {
      return { ok: false, error: 'Service not found. Please specify a valid service.' };
    }

    // Find stylist if specified
    let stylist = null;
    if (args.stylistName && args.stylistName.toLowerCase() !== 'first available') {
      stylist = await prisma.stylist.findFirst({
        where: { name: { contains: args.stylistName }, active: true }
      });
    }

    // If no stylist specified, find first available
    if (!stylist) {
      stylist = await prisma.stylist.findFirst({
        where: { active: true, acceptingNew: true },
        orderBy: { name: 'asc' }
      });
    }

    // Parse date and time
    let appointmentDate: Date;
    try {
      // Try to parse various date formats
      const dateStr = args.preferredDate;
      const timeStr = args.preferredTime;

      // Parse date
      let parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        // Try parsing relative dates like "tomorrow", "next tuesday"
        const today = new Date();
        const lower = dateStr.toLowerCase();
        if (lower === 'today') {
          parsedDate = today;
        } else if (lower === 'tomorrow') {
          parsedDate = new Date(today);
          parsedDate.setDate(parsedDate.getDate() + 1);
        } else {
          return { ok: false, error: 'Could not understand the date. Please provide a specific date.' };
        }
      }

      // Parse time
      const timeMatch = timeStr.match(/(\d+):?(\d*)\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3]?.toUpperCase();

        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;

        parsedDate.setHours(hours, minutes, 0, 0);
      }

      appointmentDate = parsedDate;
    } catch (e) {
      return { ok: false, error: 'Could not parse the appointment date/time.' };
    }

    // Check if slot is still available
    const slotEnd = new Date(appointmentDate.getTime() + service.duration * 60000);
    const conflict = await prisma.appointment.findFirst({
      where: {
        status: 'confirmed',
        ...(stylist ? { stylistId: stylist.id } : {}),
        appointmentDate: {
          gte: appointmentDate,
          lt: slotEnd
        }
      }
    });

    if (conflict) {
      return {
        ok: false,
        error: 'Sorry, that time slot is no longer available. Would you like to check other times?'
      };
    }

    // Find call log if available
    let callLogId: string | undefined;
    if (args.callSid) {
      const callLog = await prisma.callLog.findUnique({ where: { callSid: args.callSid } });
      callLogId = callLog?.id;
    }

    // Create the appointment
    const confirmationCode = generateConfirmationCode();
    const appointment = await prisma.appointment.create({
      data: {
        serviceId: service.id,
        stylistId: stylist?.id,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        customerEmail: args.customerEmail,
        appointmentDate,
        duration: service.duration,
        notes: args.notes,
        addOns: args.addOns ? JSON.stringify(args.addOns) : null,
        confirmationCode,
        callLogId
      },
      include: { service: true, stylist: true }
    });

    const config = await prisma.businessConfig.findFirst();
    const salonName = config?.salonName || 'Our Salon';

    // Send SMS confirmation (async)
    sendAppointmentConfirmation({
      to: args.customerPhone,
      customerName: args.customerName,
      salonName,
      serviceName: service.name,
      stylistName: stylist?.name || 'our team',
      appointmentDate: formatDate(appointmentDate),
      appointmentTime: formatTime(appointmentDate),
      confirmationCode
    }).catch(err => console.error('SMS send failed:', err));

    // Send notification (async)
    notifyAppointmentBooked({
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      serviceName: service.name,
      stylistName: stylist?.name,
      appointmentDate: formatDate(appointmentDate),
      appointmentTime: formatTime(appointmentDate),
      confirmationCode
    }).catch(err => console.error('Notification failed:', err));

    return {
      ok: true,
      confirmationCode,
      appointment: {
        service: service.name,
        stylist: stylist?.name || 'First available',
        date: formatDate(appointmentDate),
        time: formatTime(appointmentDate),
        duration: `${service.duration} minutes`
      },
      message: `Perfect — you're all set! I've scheduled you for a ${service.name} with ${stylist?.name || 'our team'} on ${formatDate(appointmentDate)} at ${formatTime(appointmentDate)}. Your confirmation code is ${confirmationCode}. I've sent a text to confirm the details.`
    };
  },

  /**
   * Reschedule an existing appointment
   */
  async rescheduleAppointment(args: {
    confirmationCode?: string;
    customerPhone?: string;
    customerName?: string;
    newDate: string;
    newTime: string;
  }) {
    await logIntent('rescheduleAppointment', args);

    // Find the appointment
    let appointment;
    if (args.confirmationCode) {
      appointment = await prisma.appointment.findUnique({
        where: { confirmationCode: args.confirmationCode },
        include: { service: true, stylist: true }
      });
    } else if (args.customerPhone) {
      appointment = await prisma.appointment.findFirst({
        where: {
          customerPhone: { contains: args.customerPhone.replace(/\D/g, '').slice(-10) },
          status: 'confirmed',
          appointmentDate: { gte: new Date() }
        },
        include: { service: true, stylist: true },
        orderBy: { appointmentDate: 'asc' }
      });
    } else if (args.customerName) {
      appointment = await prisma.appointment.findFirst({
        where: {
          customerName: { contains: args.customerName },
          status: 'confirmed',
          appointmentDate: { gte: new Date() }
        },
        include: { service: true, stylist: true },
        orderBy: { appointmentDate: 'asc' }
      });
    }

    if (!appointment) {
      return {
        ok: false,
        error: 'I couldn\'t find that appointment. Can you provide the confirmation code or phone number?'
      };
    }

    // Parse new date/time
    let newAppointmentDate: Date;
    try {
      const dateStr = args.newDate;
      const timeStr = args.newTime;

      let parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        const today = new Date();
        const lower = dateStr.toLowerCase();
        if (lower === 'today') {
          parsedDate = today;
        } else if (lower === 'tomorrow') {
          parsedDate = new Date(today);
          parsedDate.setDate(parsedDate.getDate() + 1);
        } else {
          return { ok: false, error: 'Could not understand the new date.' };
        }
      }

      const timeMatch = timeStr.match(/(\d+):?(\d*)\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3]?.toUpperCase();

        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;

        parsedDate.setHours(hours, minutes, 0, 0);
      }

      newAppointmentDate = parsedDate;
    } catch (e) {
      return { ok: false, error: 'Could not parse the new date/time.' };
    }

    // Check availability
    const slotEnd = new Date(newAppointmentDate.getTime() + appointment.duration * 60000);
    const conflict = await prisma.appointment.findFirst({
      where: {
        id: { not: appointment.id },
        status: 'confirmed',
        stylistId: appointment.stylistId,
        appointmentDate: {
          gte: newAppointmentDate,
          lt: slotEnd
        }
      }
    });

    if (conflict) {
      return {
        ok: false,
        error: 'That time slot is not available. Would you like to check other times?'
      };
    }

    // Update the appointment
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { appointmentDate: newAppointmentDate }
    });

    const config = await prisma.businessConfig.findFirst();
    const salonName = config?.salonName || 'Our Salon';

    // Send SMS update (async)
    sendSMS({
      to: appointment.customerPhone,
      body: `Hi ${appointment.customerName}! Your appointment at ${salonName} has been rescheduled to ${formatDate(newAppointmentDate)} at ${formatTime(newAppointmentDate)}. See you then!`
    }).catch(err => console.error('SMS send failed:', err));

    return {
      ok: true,
      message: `All set. Your appointment has been moved to ${formatDate(newAppointmentDate)} at ${formatTime(newAppointmentDate)}. See you then!`
    };
  },

  /**
   * Cancel an appointment
   */
  async cancelAppointment(args: {
    confirmationCode?: string;
    customerPhone?: string;
    customerName?: string;
    reason?: string;
  }) {
    await logIntent('cancelAppointment', args);

    // Find the appointment
    let appointment;
    if (args.confirmationCode) {
      appointment = await prisma.appointment.findUnique({
        where: { confirmationCode: args.confirmationCode },
        include: { service: true, stylist: true }
      });
    } else if (args.customerPhone) {
      appointment = await prisma.appointment.findFirst({
        where: {
          customerPhone: { contains: args.customerPhone.replace(/\D/g, '').slice(-10) },
          status: 'confirmed',
          appointmentDate: { gte: new Date() }
        },
        include: { service: true, stylist: true },
        orderBy: { appointmentDate: 'asc' }
      });
    } else if (args.customerName) {
      appointment = await prisma.appointment.findFirst({
        where: {
          customerName: { contains: args.customerName },
          status: 'confirmed',
          appointmentDate: { gte: new Date() }
        },
        include: { service: true, stylist: true },
        orderBy: { appointmentDate: 'asc' }
      });
    }

    if (!appointment) {
      return {
        ok: false,
        error: 'I couldn\'t find that appointment. Can you provide the confirmation code or phone number?'
      };
    }

    // Check cancellation policy
    const config = await prisma.businessConfig.findFirst();
    const policyHours = config?.cancellationPolicy || 24;
    const hoursUntilAppointment = (appointment.appointmentDate.getTime() - Date.now()) / (1000 * 60 * 60);

    let warningMessage = '';
    if (hoursUntilAppointment < policyHours) {
      warningMessage = `I should let you know we have a ${policyHours}-hour cancellation policy. `;
    }

    // Cancel the appointment
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: args.reason
      }
    });

    const salonName = config?.salonName || 'Our Salon';

    // Send SMS confirmation (async)
    sendCancellationConfirmation({
      to: appointment.customerPhone,
      customerName: appointment.customerName,
      salonName,
      serviceName: appointment.service.name,
      appointmentDate: formatDate(appointment.appointmentDate),
      appointmentTime: formatTime(appointment.appointmentDate)
    }).catch(err => console.error('SMS send failed:', err));

    // Notify staff (async)
    notifyAppointmentCancelled({
      customerName: appointment.customerName,
      customerPhone: appointment.customerPhone,
      serviceName: appointment.service.name,
      stylistName: appointment.stylist?.name,
      appointmentDate: formatDate(appointment.appointmentDate),
      appointmentTime: formatTime(appointment.appointmentDate),
      reason: args.reason
    }).catch(err => console.error('Notification failed:', err));

    return {
      ok: true,
      message: `${warningMessage}Your appointment has been canceled. Let us know anytime if you'd like to book again!`
    };
  },

  /**
   * Get salon hours
   */
  async getSalonHours() {
    await logIntent('getSalonHours');

    const config = await prisma.businessConfig.findFirst();
    const hours = config?.hoursJson ? JSON.parse(config.hoursJson) : {};
    const closedDays = config?.closedDays ? JSON.parse(config.closedDays) : ['Sunday', 'Monday'];

    let hoursText = Object.entries(hours)
      .map(([day, time]) => `${day}: ${time}`)
      .join(', ');

    if (closedDays.length > 0) {
      hoursText += `. Closed ${closedDays.join(' and ')}.`;
    }

    return {
      ok: true,
      hours,
      closedDays,
      message: hoursText || 'We\'re open Tuesday through Saturday, 9 AM to 7 PM, and closed Sunday and Monday.'
    };
  },

  /**
   * Get salon location
   */
  async getSalonLocation() {
    await logIntent('getSalonLocation');

    const config = await prisma.businessConfig.findFirst();

    return {
      ok: true,
      address: config?.address || '123 Main Street',
      landmark: config?.landmark,
      message: config?.landmark
        ? `We're located at ${config.address}, next to ${config.landmark}.`
        : `We're located at ${config?.address || '123 Main Street'}.`,
      offerToText: 'Should I text you the location link?'
    };
  },

  /**
   * Suggest add-on services
   */
  async suggestAddOns(args: { serviceName?: string; serviceCategory?: string }) {
    await logIntent('suggestAddOns', args);

    // Find relevant add-ons
    const addOns = await prisma.addOn.findMany({
      where: { active: true }
    });

    // Filter by service category if provided
    let relevant = addOns;
    if (args.serviceCategory) {
      relevant = addOns.filter(a => {
        const suggestFor = JSON.parse(a.suggestFor || '[]');
        return suggestFor.includes(args.serviceCategory);
      });
    }

    if (relevant.length === 0) {
      return { ok: true, addOns: [], message: '' };
    }

    const addOnList = relevant.map(a => ({
      name: a.name,
      price: `$${a.price}`,
      duration: `+${a.duration} min`,
      description: a.description
    }));

    return {
      ok: true,
      addOns: addOnList,
      message: `Would you like to add a ${relevant.map(a => a.name).join(' or ')}? Many guests choose that for the best results.`
    };
  },

  /**
   * Transfer to human agent
   */
  async transferToHuman(args: { reason?: string; callerPhone?: string; callerName?: string }) {
    await logIntent('transferToHuman', args);

    // Send notification (async)
    notifyTransferRequest({
      fromNumber: args.callerPhone || 'Unknown',
      callerName: args.callerName,
      reason: args.reason
    }).catch(err => console.error('Transfer notification failed:', err));

    return {
      ok: true,
      reason: args?.reason || 'unspecified',
      action: 'TRANSFER',
      message: 'No problem — I\'ll connect you with a team member. One moment…'
    };
  },

  /**
   * Collect callback info when transfer unavailable
   */
  async collectCallbackInfo(args: {
    customerName: string;
    customerPhone: string;
    reason?: string;
    preferredTime?: string;
  }) {
    await logIntent('collectCallbackInfo', args);

    // Create a message record
    await prisma.message.create({
      data: {
        callLogId: undefined,
        type: 'callback_request',
        subject: 'Callback Request',
        body: JSON.stringify({
          name: args.customerName,
          phone: args.customerPhone,
          reason: args.reason,
          preferredTime: args.preferredTime
        })
      }
    });

    // Notify staff (async)
    notifyCallbackRequest({
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      reason: args.reason,
      preferredTime: args.preferredTime
    }).catch(err => console.error('Callback notification failed:', err));

    return {
      ok: true,
      message: 'I\'ve noted your information. A team member will call you back as soon as possible.'
    };
  },

  /**
   * Handle spam/sales calls
   */
  async handleSpamCall() {
    await logIntent('handleSpamCall');
    return {
      ok: true,
      action: 'END_CALL',
      message: 'We aren\'t interested, but thank you for reaching out. Have a great day!'
    };
  },

  /**
   * Answer general questions using knowledge base
   */
  async answerQuestion(args: { question: string; language?: string; callSid?: string }) {
    await logIntent('answerQuestion', { question: args.question });

    const lang = (args.language || 'en').substring(0, 5).toLowerCase();
    const res = await askKB(args.question, lang);

    // Get confidence policy
    const cfg = await prisma.businessConfig.findFirst();
    const minConfidence = cfg?.kbMinConfidence ?? 0.55;
    const lowConfidenceAction = cfg?.lowConfidenceAction ?? 'ask_clarify';

    // Log citation
    try {
      const call = args?.callSid
        ? await prisma.callLog.findUnique({ where: { callSid: String(args.callSid) } })
        : null;

      await prisma.citationsLog.create({
        data: {
          callLogId: call?.id || null,
          callSid: args?.callSid || null,
          question: args.question,
          language: lang,
          sources: JSON.stringify(res.sources || [])
        }
      });
    } catch {}

    // Check confidence threshold
    const topConfidence = res.sources[0]?.score ?? 0;

    if (topConfidence < minConfidence) {
      await logIntent('lowConfidenceKB', {
        question: args.question,
        confidence: topConfidence,
        action: lowConfidenceAction
      });

      if (lowConfidenceAction === 'transfer') {
        return {
          ok: false,
          lowConfidence: true,
          action: 'TRANSFER',
          message: "I'm not confident I have the right information for that question. Let me transfer you to someone who can help better."
        };
      } else if (lowConfidenceAction === 'voicemail') {
        return {
          ok: false,
          lowConfidence: true,
          action: 'VOICEMAIL',
          message: "I'm not sure I have the right answer for that. Would you like to leave a message and we'll get back to you with the correct information?"
        };
      } else {
        return {
          ok: false,
          lowConfidence: true,
          action: 'CLARIFY',
          message: "I'm not entirely sure about that. Could you rephrase your question or ask about something more specific like services, pricing, or appointment availability?",
          partialContext: res.context,
          sources: res.sources
        };
      }
    }

    return {
      ...res,
      ok: true,
      confidenceOk: true,
      topConfidence
    };
  },

  /**
   * Send an SMS message to a phone number
   */
  async sendTextMessage(args: { to: string; message: string }) {
    await logIntent('sendTextMessage', { to: args.to });

    const result = await sendSMS({
      to: args.to,
      body: args.message
    });

    if (result.success) {
      return {
        ok: true,
        message: `I've sent a text message to ${args.to}.`
      };
    } else {
      return {
        ok: false,
        error: result.error || 'Failed to send SMS'
      };
    }
  },

  /**
   * Look up an existing appointment
   */
  async lookupAppointment(args: {
    confirmationCode?: string;
    customerPhone?: string;
    customerName?: string;
  }) {
    await logIntent('lookupAppointment', args);

    let appointment;
    if (args.confirmationCode) {
      appointment = await prisma.appointment.findUnique({
        where: { confirmationCode: args.confirmationCode },
        include: { service: true, stylist: true }
      });
    } else if (args.customerPhone) {
      appointment = await prisma.appointment.findFirst({
        where: {
          customerPhone: { contains: args.customerPhone.replace(/\D/g, '').slice(-10) },
          status: 'confirmed',
          appointmentDate: { gte: new Date() }
        },
        include: { service: true, stylist: true },
        orderBy: { appointmentDate: 'asc' }
      });
    } else if (args.customerName) {
      appointment = await prisma.appointment.findFirst({
        where: {
          customerName: { contains: args.customerName },
          status: 'confirmed',
          appointmentDate: { gte: new Date() }
        },
        include: { service: true, stylist: true },
        orderBy: { appointmentDate: 'asc' }
      });
    }

    if (!appointment) {
      return {
        ok: false,
        message: 'I couldn\'t find an upcoming appointment with that information.'
      };
    }

    return {
      ok: true,
      appointment: {
        confirmationCode: appointment.confirmationCode,
        service: appointment.service.name,
        stylist: appointment.stylist?.name || 'Staff',
        date: formatDate(appointment.appointmentDate),
        time: formatTime(appointment.appointmentDate),
        duration: `${appointment.duration} minutes`
      }
    };
  }
};

// Handle tool calls from OpenAI
export async function handleToolCall(name: string, args: any, callId?: string) {
  const tool = (tools as any)[name];
  if (!tool) {
    return { error: `Unknown tool: ${name}` };
  }

  try {
    const result = await tool(args);
    return result;
  } catch (err: any) {
    return { error: err.message || 'Tool execution failed' };
  }
}

// Tool specifications for OpenAI
export const toolSpecs = [
  {
    name: 'getServicePricing',
    description: 'Get salon services and pricing information. Use when caller asks about prices, services offered, or what the salon does.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Service category: cut, color, treatment, styling, other' },
        serviceName: { type: 'string', description: 'Specific service name to look up' }
      }
    }
  },
  {
    name: 'getStylistInfo',
    description: 'Get information about salon stylists, their specialties and availability',
    input_schema: {
      type: 'object',
      properties: {
        stylistName: { type: 'string', description: 'Name of a specific stylist to look up' }
      }
    }
  },
  {
    name: 'checkAvailability',
    description: 'Check available appointment times for a service and/or stylist',
    input_schema: {
      type: 'object',
      properties: {
        serviceName: { type: 'string', description: 'Name of the service' },
        stylistName: { type: 'string', description: 'Preferred stylist name' },
        preferredDate: { type: 'string', description: 'Preferred date (e.g., "tomorrow", "next Tuesday", "2024-03-15")' },
        preferredTime: { type: 'string', description: 'Preferred time: morning, afternoon, evening, or specific time' }
      }
    }
  },
  {
    name: 'bookAppointment',
    description: 'Book a salon appointment. Gather service, preferred date/time, and customer contact info first.',
    input_schema: {
      type: 'object',
      properties: {
        serviceName: { type: 'string', description: 'Name of the service to book' },
        stylistName: { type: 'string', description: 'Preferred stylist or "first available"' },
        preferredDate: { type: 'string', description: 'Appointment date' },
        preferredTime: { type: 'string', description: 'Appointment time' },
        customerName: { type: 'string', description: 'Customer full name' },
        customerPhone: { type: 'string', description: 'Customer phone number' },
        customerEmail: { type: 'string', description: 'Customer email (optional)' },
        notes: { type: 'string', description: 'Any special notes or requests' },
        addOns: { type: 'array', items: { type: 'string' }, description: 'List of add-on services' }
      },
      required: ['serviceName', 'preferredDate', 'preferredTime', 'customerName', 'customerPhone']
    }
  },
  {
    name: 'rescheduleAppointment',
    description: 'Reschedule an existing appointment to a new date/time',
    input_schema: {
      type: 'object',
      properties: {
        confirmationCode: { type: 'string', description: 'Appointment confirmation code' },
        customerPhone: { type: 'string', description: 'Customer phone number to look up appointment' },
        customerName: { type: 'string', description: 'Customer name to look up appointment' },
        newDate: { type: 'string', description: 'New appointment date' },
        newTime: { type: 'string', description: 'New appointment time' }
      },
      required: ['newDate', 'newTime']
    }
  },
  {
    name: 'cancelAppointment',
    description: 'Cancel an existing appointment',
    input_schema: {
      type: 'object',
      properties: {
        confirmationCode: { type: 'string', description: 'Appointment confirmation code' },
        customerPhone: { type: 'string', description: 'Customer phone number to look up appointment' },
        customerName: { type: 'string', description: 'Customer name to look up appointment' },
        reason: { type: 'string', description: 'Reason for cancellation (optional)' }
      }
    }
  },
  {
    name: 'lookupAppointment',
    description: 'Look up an existing appointment by confirmation code, phone, or name',
    input_schema: {
      type: 'object',
      properties: {
        confirmationCode: { type: 'string', description: 'Appointment confirmation code' },
        customerPhone: { type: 'string', description: 'Customer phone number' },
        customerName: { type: 'string', description: 'Customer name' }
      }
    }
  },
  {
    name: 'getSalonHours',
    description: 'Get salon business hours and days closed',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'getSalonLocation',
    description: 'Get salon address and directions',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'suggestAddOns',
    description: 'Suggest add-on services like deep conditioning or blowout based on the main service',
    input_schema: {
      type: 'object',
      properties: {
        serviceName: { type: 'string', description: 'Main service being booked' },
        serviceCategory: { type: 'string', description: 'Category of the service: cut, color, treatment' }
      }
    }
  },
  {
    name: 'transferToHuman',
    description: 'Transfer the caller to a human staff member. Use when caller insists or for complex issues.',
    input_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for transfer' },
        callerPhone: { type: 'string', description: 'Caller phone number' },
        callerName: { type: 'string', description: 'Caller name if known' }
      }
    }
  },
  {
    name: 'collectCallbackInfo',
    description: 'Collect callback information when transfer is not available',
    input_schema: {
      type: 'object',
      properties: {
        customerName: { type: 'string', description: 'Customer name' },
        customerPhone: { type: 'string', description: 'Phone number for callback' },
        reason: { type: 'string', description: 'Reason for callback' },
        preferredTime: { type: 'string', description: 'Preferred callback time' }
      },
      required: ['customerName', 'customerPhone']
    }
  },
  {
    name: 'handleSpamCall',
    description: 'Handle spam or sales calls politely and end the conversation',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'answerQuestion',
    description: 'Answer general questions about the salon using the knowledge base',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to answer' },
        language: { type: 'string', description: 'Language code (en, es, etc)' }
      },
      required: ['question']
    }
  },
  {
    name: 'sendTextMessage',
    description: 'Send an SMS text message to a phone number. Use for sending location links or appointment confirmations.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone number to send SMS to' },
        message: { type: 'string', description: 'The text message content' }
      },
      required: ['to', 'message']
    }
  }
];
