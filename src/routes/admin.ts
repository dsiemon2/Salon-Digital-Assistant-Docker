import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';

const router = Router();
const basePath = '/SalonSales';

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.query.token || req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).render('admin/error', { message: 'Unauthorized' });
  }
  next();
}

// Helper: Get branding settings
async function getBranding() {
  let branding = await prisma.branding.findFirst();
  if (!branding) {
    branding = await prisma.branding.create({
      data: {
        id: 'default',
        primaryColor: '#db2777',
        secondaryColor: '#be185d',
        accentColor: '#ec4899',
        headingFont: 'Inter',
        bodyFont: 'Inter'
      }
    });
  }
  return branding;
}

// Helper: Format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ============================================
// DASHBOARD
// ============================================

router.get('/admin', requireAuth, async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    callCount,
    appointmentCount,
    todayAppointments,
    recentCalls,
    upcomingAppointments,
    intentStats,
    branding
  ] = await Promise.all([
    prisma.callLog.count(),
    prisma.appointment.count({ where: { status: 'confirmed' } }),
    prisma.appointment.count({
      where: {
        status: 'confirmed',
        appointmentDate: { gte: today, lt: tomorrow }
      }
    }),
    prisma.callLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.appointment.findMany({
      where: {
        status: 'confirmed',
        appointmentDate: { gte: new Date() }
      },
      orderBy: { appointmentDate: 'asc' },
      take: 5,
      include: { service: true, stylist: true }
    }),
    prisma.intentLog.groupBy({
      by: ['intent'],
      _count: true,
      orderBy: { _count: { intent: 'desc' } },
      take: 5
    }),
    getBranding()
  ]);

  const config = await prisma.businessConfig.findFirst();

  res.render('admin/dashboard', {
    token: req.query.token,
    basePath,
    branding,
    salonName: config?.salonName || 'Your Salon',
    stats: { callCount, appointmentCount, todayAppointments },
    recentCalls,
    upcomingAppointments,
    intentStats,
    formatDate,
    formatTime
  });
});

// ============================================
// APPOINTMENTS
// ============================================

router.get('/admin/appointments', requireAuth, async (req, res) => {
  const filter = req.query.filter || 'upcoming';
  const now = new Date();

  let whereClause: any = {};
  if (filter === 'upcoming') {
    whereClause = { appointmentDate: { gte: now }, status: 'confirmed' };
  } else if (filter === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    whereClause = { appointmentDate: { gte: today, lt: tomorrow } };
  } else if (filter === 'past') {
    whereClause = { appointmentDate: { lt: now } };
  } else if (filter === 'cancelled') {
    whereClause = { status: 'cancelled' };
  }

  const [appointments, branding] = await Promise.all([
    prisma.appointment.findMany({
      where: whereClause,
      orderBy: { appointmentDate: filter === 'past' ? 'desc' : 'asc' },
      take: 100,
      include: { service: true, stylist: true }
    }),
    getBranding()
  ]);

  const stats = {
    total: await prisma.appointment.count(),
    confirmed: await prisma.appointment.count({ where: { status: 'confirmed' } }),
    cancelled: await prisma.appointment.count({ where: { status: 'cancelled' } }),
    completed: await prisma.appointment.count({ where: { status: 'completed' } })
  };

  res.render('admin/appointments', {
    token: req.query.token,
    basePath,
    branding,
    appointments,
    stats,
    filter,
    formatDate,
    formatTime
  });
});

// Update appointment status
router.post('/admin/appointments/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['confirmed', 'completed', 'cancelled', 'no_show'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  await prisma.appointment.update({
    where: { id: req.params.id },
    data: {
      status,
      ...(status === 'cancelled' ? { cancelledAt: new Date() } : {})
    }
  });

  res.json({ success: true });
});

// ============================================
// STYLISTS
// ============================================

router.get('/admin/stylists', requireAuth, async (req, res) => {
  const [stylists, branding] = await Promise.all([
    prisma.stylist.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { appointments: true } },
        availability: { orderBy: { dayOfWeek: 'asc' } }
      }
    }),
    getBranding()
  ]);

  res.render('admin/stylists', { token: req.query.token, basePath, branding, stylists });
});

router.get('/admin/stylists/new', requireAuth, async (req, res) => {
  const [services, branding] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    getBranding()
  ]);
  res.render('admin/stylist_form', { token: req.query.token, basePath, branding, stylist: null, services });
});

router.get('/admin/stylists/:id/edit', requireAuth, async (req, res) => {
  const [stylist, services, branding] = await Promise.all([
    prisma.stylist.findUnique({
      where: { id: req.params.id },
      include: { availability: true, services: true }
    }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    getBranding()
  ]);
  res.render('admin/stylist_form', { token: req.query.token, basePath, branding, stylist, services });
});

router.post('/admin/stylists', requireAuth, async (req, res) => {
  const { name, phone, email, bio, specialties, active, acceptingNew, services, availability } = req.body;

  const stylist = await prisma.stylist.create({
    data: {
      name,
      phone: phone || null,
      email: email || null,
      bio: bio || null,
      specialties: specialties || null,
      active: active === 'on',
      acceptingNew: acceptingNew === 'on'
    }
  });

  // Add services
  if (services && Array.isArray(services)) {
    for (const serviceId of services) {
      await prisma.stylistService.create({
        data: { stylistId: stylist.id, serviceId }
      });
    }
  }

  // Add availability
  if (availability) {
    const avail = typeof availability === 'string' ? JSON.parse(availability) : availability;
    for (const a of avail) {
      await prisma.stylistAvailability.create({
        data: {
          stylistId: stylist.id,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime
        }
      });
    }
  }

  res.redirect(`/SalonSales/admin/stylists?token=${req.query.token}`);
});

router.post('/admin/stylists/:id', requireAuth, async (req, res) => {
  const { name, phone, email, bio, specialties, active, acceptingNew, services, availability } = req.body;

  await prisma.stylist.update({
    where: { id: req.params.id },
    data: {
      name,
      phone: phone || null,
      email: email || null,
      bio: bio || null,
      specialties: specialties || null,
      active: active === 'on',
      acceptingNew: acceptingNew === 'on'
    }
  });

  // Update services
  await prisma.stylistService.deleteMany({ where: { stylistId: req.params.id } });
  if (services) {
    const serviceList = Array.isArray(services) ? services : [services];
    for (const serviceId of serviceList) {
      await prisma.stylistService.create({
        data: { stylistId: req.params.id, serviceId }
      });
    }
  }

  // Update availability
  await prisma.stylistAvailability.deleteMany({ where: { stylistId: req.params.id } });
  if (availability) {
    const avail = typeof availability === 'string' ? JSON.parse(availability) : availability;
    for (const a of avail) {
      await prisma.stylistAvailability.create({
        data: {
          stylistId: req.params.id,
          dayOfWeek: parseInt(a.dayOfWeek),
          startTime: a.startTime,
          endTime: a.endTime
        }
      });
    }
  }

  res.redirect(`/SalonSales/admin/stylists?token=${req.query.token}`);
});

router.post('/admin/stylists/:id/delete', requireAuth, async (req, res) => {
  await prisma.stylist.delete({ where: { id: req.params.id } });
  res.redirect(`/SalonSales/admin/stylists?token=${req.query.token}`);
});

// ============================================
// SERVICES
// ============================================

router.get('/admin/services', requireAuth, async (req, res) => {
  const [services, addOns, branding] = await Promise.all([
    prisma.service.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      include: { _count: { select: { appointments: true } } }
    }),
    prisma.addOn.findMany({ orderBy: { name: 'asc' } }),
    getBranding()
  ]);

  res.render('admin/services', { token: req.query.token, basePath, branding, services, addOns });
});

router.post('/admin/services', requireAuth, async (req, res) => {
  const { id, name, description, category, price, priceVaries, duration, active, sortOrder } = req.body;

  const data = {
    name,
    description: description || null,
    category: category || 'general',
    price: parseFloat(price) || 0,
    priceVaries: priceVaries === 'on',
    duration: parseInt(duration) || 30,
    active: active === 'on',
    sortOrder: parseInt(sortOrder) || 0
  };

  if (id) {
    await prisma.service.update({ where: { id }, data });
  } else {
    await prisma.service.create({ data });
  }

  if (req.headers.accept?.includes('application/json')) {
    return res.json({ success: true });
  }
  res.redirect(`/SalonSales/admin/services?token=${req.query.token}`);
});

router.post('/admin/services/:id/delete', requireAuth, async (req, res) => {
  await prisma.service.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Add-ons
router.post('/admin/addons', requireAuth, async (req, res) => {
  const { id, name, description, price, duration, suggestFor, active } = req.body;

  const data = {
    name,
    description: description || null,
    price: parseFloat(price) || 0,
    duration: parseInt(duration) || 15,
    suggestFor: suggestFor || '[]',
    active: active === 'on'
  };

  if (id) {
    await prisma.addOn.update({ where: { id }, data });
  } else {
    await prisma.addOn.create({ data });
  }

  res.json({ success: true });
});

router.post('/admin/addons/:id/delete', requireAuth, async (req, res) => {
  await prisma.addOn.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ============================================
// CALL LOGS
// ============================================

router.get('/admin/calls', requireAuth, async (req, res) => {
  const [calls, branding] = await Promise.all([
    prisma.callLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        appointments: { include: { service: true } },
        messages: true,
        intents: true
      }
    }),
    getBranding()
  ]);

  res.render('admin/calls', { token: req.query.token, basePath, branding, calls, formatDate, formatTime });
});

// ============================================
// AI SCRIPTS & RESPONSES
// ============================================

router.get('/admin/scripts', requireAuth, async (req, res) => {
  const [scripts, branding] = await Promise.all([
    prisma.aiScript.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }]
    }),
    getBranding()
  ]);

  // Group by category
  const categories = ['greeting', 'booking', 'reschedule', 'cancel', 'pricing', 'hours', 'location', 'stylist', 'add_on', 'edge_case', 'closing'];
  const grouped: Record<string, any[]> = {};
  for (const cat of categories) {
    grouped[cat] = scripts.filter(s => s.category === cat);
  }

  res.render('admin/scripts', { token: req.query.token, basePath, branding, scripts, grouped, categories });
});

router.post('/admin/scripts', requireAuth, async (req, res) => {
  const { id, category, name, title, content, variables, isDefault, enabled, sortOrder } = req.body;

  const data = {
    category,
    name,
    title,
    content,
    variables: variables || '[]',
    isDefault: isDefault === 'on',
    enabled: enabled === 'on',
    sortOrder: parseInt(sortOrder) || 0
  };

  if (id) {
    await prisma.aiScript.update({ where: { id }, data });
  } else {
    await prisma.aiScript.create({ data });
  }

  res.json({ success: true });
});

router.post('/admin/scripts/:id/delete', requireAuth, async (req, res) => {
  await prisma.aiScript.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Seed default scripts
router.post('/admin/scripts/seed', requireAuth, async (req, res) => {
  const defaultScripts = [
    { category: 'greeting', name: 'greeting_professional', title: 'Professional Greeting', content: 'Thank you for calling {{salonName}}, this is your virtual receptionist. How may I help you today?', isDefault: true },
    { category: 'greeting', name: 'greeting_friendly', title: 'Friendly Greeting', content: 'Hi there! Thanks for calling {{salonName}} — where great hair days begin! What can I help you with?', isDefault: false },
    { category: 'greeting', name: 'greeting_busy', title: 'Busy Hours Greeting', content: 'Thanks for calling {{salonName}}. Our stylists are currently with guests, but I can help you right away — what do you need today?', isDefault: false },
    { category: 'booking', name: 'booking_start', title: 'Start Booking', content: 'Absolutely — I can help you book an appointment! Which service would you like today?', isDefault: true },
    { category: 'booking', name: 'booking_services', title: 'List Services', content: 'No problem! Here are our most popular options: Haircut, color, highlights, balayage, blowout, men\'s cut, kids cut, extensions, and styling. Which one sounds closest to what you want?', isDefault: true },
    { category: 'booking', name: 'booking_stylist', title: 'Ask Stylist', content: 'Great choice! Do you have a preferred stylist, or would you like first available?', isDefault: true },
    { category: 'booking', name: 'booking_confirm', title: 'Confirm Booking', content: 'Perfect — you\'re all set! I\'ve scheduled you for a {{serviceName}} with {{stylistName}} on {{appointmentDate}} at {{appointmentTime}}. Can I get your phone number to send a confirmation text?', isDefault: true },
    { category: 'reschedule', name: 'reschedule_start', title: 'Start Reschedule', content: 'Of course — I can help you reschedule. What\'s the name or phone number for the existing appointment?', isDefault: true },
    { category: 'reschedule', name: 'reschedule_confirm', title: 'Confirm Reschedule', content: 'All set. Your appointment has been moved to {{newDate}} at {{newTime}}. See you then!', isDefault: true },
    { category: 'cancel', name: 'cancel_start', title: 'Start Cancel', content: 'I can take care of that for you. What\'s the name or phone number on the appointment?', isDefault: true },
    { category: 'cancel', name: 'cancel_policy', title: 'Cancellation Policy', content: 'I should let you know we have a {{policyHours}}-hour cancellation policy. Would you like to continue with canceling?', isDefault: true },
    { category: 'cancel', name: 'cancel_confirm', title: 'Confirm Cancel', content: 'Your appointment has been canceled. Let us know anytime if you\'d like to book again!', isDefault: true },
    { category: 'pricing', name: 'pricing_list', title: 'Price List', content: 'Here are our standard prices: Haircut: $45+, Color: $95+, Highlights: $120+, Balayage: $150+, Blowout: $35+, Men\'s cut: $30+, Kids cut: $25+. Would you like to book something today?', isDefault: true },
    { category: 'hours', name: 'hours_info', title: 'Business Hours', content: 'We\'re open Tuesday through Saturday, 9 AM to 7 PM, and closed Sunday and Monday. Would you like help booking an appointment?', isDefault: true },
    { category: 'location', name: 'location_info', title: 'Location Info', content: 'We\'re located at {{address}}, next to {{landmark}}. Should I text you the location link?', isDefault: true },
    { category: 'stylist', name: 'stylist_info', title: 'Stylist Info', content: 'All of our stylists are professionally trained and specialize in modern cuts and color. Do you have someone in mind, or should I find the soonest available appointment?', isDefault: true },
    { category: 'add_on', name: 'suggest_addon', title: 'Suggest Add-On', content: 'Would you like to add a deep-conditioning treatment or a blowout? Many guests choose that for the best results.', isDefault: true },
    { category: 'edge_case', name: 'spam_call', title: 'Spam/Sales Call', content: 'We aren\'t interested, but thank you for reaching out. Have a great day!', isDefault: true },
    { category: 'edge_case', name: 'confused_caller', title: 'Confused Caller', content: 'I\'m here to help! It sounds like you\'d like to {{bestGuess}}. Is that correct?', isDefault: true },
    { category: 'edge_case', name: 'unavailable_service', title: 'Unavailable Service', content: 'We don\'t currently offer that service, but we do offer {{closestMatch}}.', isDefault: true },
    { category: 'edge_case', name: 'rude_caller', title: 'Rude Caller', content: 'I\'m here to help, but I can only continue if we keep things respectful.', isDefault: true },
    { category: 'closing', name: 'closing_default', title: 'Default Closing', content: 'Thank you for calling {{salonName}}! We look forward to seeing you soon. Have a beautiful day!', isDefault: true }
  ];

  for (const script of defaultScripts) {
    await prisma.aiScript.upsert({
      where: { name: script.name },
      create: { ...script, enabled: true, sortOrder: 0 },
      update: script
    });
  }

  res.json({ success: true, count: defaultScripts.length });
});

// ============================================
// KNOWLEDGE BASE (FAQs)
// ============================================

router.get('/admin/kb', requireAuth, async (req, res) => {
  const [docs, branding] = await Promise.all([
    prisma.knowledgeDoc.findMany({
      orderBy: { createdAt: 'desc' }
    }),
    getBranding()
  ]);

  res.render('admin/kb', { token: req.query.token, basePath, branding, docs });
});

router.get('/admin/kb/new', requireAuth, async (req, res) => {
  const branding = await getBranding();
  res.render('admin/kb_form', { token: req.query.token, basePath, branding, doc: null });
});

router.get('/admin/kb/:id/edit', requireAuth, async (req, res) => {
  const [doc, branding] = await Promise.all([
    prisma.knowledgeDoc.findUnique({ where: { id: req.params.id } }),
    getBranding()
  ]);
  res.render('admin/kb_form', { token: req.query.token, basePath, branding, doc });
});

router.post('/admin/kb', requireAuth, async (req, res) => {
  const { title, slug, language, content } = req.body;

  await prisma.knowledgeDoc.create({
    data: { title, slug, language: language || 'en', content }
  });

  res.redirect(`/SalonSales/admin/kb?token=${req.query.token}`);
});

router.post('/admin/kb/:id', requireAuth, async (req, res) => {
  const { title, slug, language, content } = req.body;

  await prisma.knowledgeDoc.update({
    where: { id: req.params.id },
    data: { title, slug, language: language || 'en', content }
  });

  res.redirect(`/SalonSales/admin/kb?token=${req.query.token}`);
});

router.post('/admin/kb/:id/delete', requireAuth, async (req, res) => {
  await prisma.knowledgeDoc.delete({ where: { id: req.params.id } });
  res.redirect(`/SalonSales/admin/kb?token=${req.query.token}`);
});

// ============================================
// SETTINGS (with Branding, StoreInfo, PaymentSettings)
// ============================================

router.get('/admin/settings', requireAuth, async (req, res) => {
  const [branding, storeInfo, paymentSettings] = await Promise.all([
    getBranding(),
    prisma.storeInfo.findFirst(),
    prisma.paymentSettings.findFirst()
  ]);

  // Merge all settings for the view
  const settings = {
    // StoreInfo
    businessName: storeInfo?.businessName || '',
    tagline: storeInfo?.tagline || '',
    description: storeInfo?.description || '',
    address: storeInfo?.address || '',
    phone: storeInfo?.phone || '',
    email: storeInfo?.email || '',
    website: storeInfo?.website || '',
    businessHours: storeInfo?.businessHours || '',
    timezone: storeInfo?.timezone || 'America/New_York',
    // Branding
    logoUrl: branding?.logoUrl || '',
    faviconUrl: branding?.faviconUrl || '',
    primaryColor: branding?.primaryColor || '#db2777',
    secondaryColor: branding?.secondaryColor || '#be185d',
    accentColor: branding?.accentColor || '#ec4899',
    headingFont: branding?.headingFont || 'Inter',
    bodyFont: branding?.bodyFont || 'Inter',
    // Payment
    paymentsEnabled: paymentSettings?.enabled || false,
    stripeEnabled: paymentSettings?.stripeEnabled || false,
    stripePublishableKey: paymentSettings?.stripePublishableKey || '',
    stripeTestMode: paymentSettings?.stripeTestMode ?? true,
    paypalEnabled: paymentSettings?.paypalEnabled || false,
    paypalClientId: paymentSettings?.paypalClientId || '',
    paypalSandbox: paymentSettings?.paypalSandbox ?? true,
    squareEnabled: paymentSettings?.squareEnabled || false,
    squareAppId: paymentSettings?.squareAppId || '',
    squareSandbox: paymentSettings?.squareSandbox ?? true
  };

  res.render('admin/settings', { token: req.query.token, basePath, branding, settings });
});

// Save all settings (StoreInfo + Branding + PaymentSettings)
router.post('/admin/settings', requireAuth, async (req, res) => {
  const {
    // StoreInfo
    businessName, tagline, description, address, phone, email, website, businessHours, timezone,
    // Branding
    logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor, headingFont, bodyFont,
    // Payment
    paymentsEnabled, stripeEnabled, stripePublishableKey, stripeSecretKey, stripeTestMode,
    paypalEnabled, paypalClientId, paypalClientSecret, paypalSandbox,
    squareEnabled, squareAppId, squareAccessToken, squareSandbox
  } = req.body;

  // Update StoreInfo
  await prisma.storeInfo.upsert({
    where: { id: 'default' },
    update: { businessName, tagline, description, address, phone, email, website, businessHours, timezone },
    create: { id: 'default', businessName, tagline, description, address, phone, email, website, businessHours, timezone }
  });

  // Update Branding
  await prisma.branding.upsert({
    where: { id: 'default' },
    update: { logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor, headingFont, bodyFont },
    create: { id: 'default', logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor, headingFont, bodyFont }
  });

  // Update PaymentSettings
  await prisma.paymentSettings.upsert({
    where: { id: 'default' },
    update: {
      enabled: paymentsEnabled === true || paymentsEnabled === 'true',
      stripeEnabled: stripeEnabled === true || stripeEnabled === 'true',
      stripePublishableKey: stripePublishableKey || '',
      stripeTestMode: stripeTestMode === true || stripeTestMode === 'true',
      paypalEnabled: paypalEnabled === true || paypalEnabled === 'true',
      paypalClientId: paypalClientId || '',
      paypalSandbox: paypalSandbox === true || paypalSandbox === 'true',
      squareEnabled: squareEnabled === true || squareEnabled === 'true',
      squareAppId: squareAppId || '',
      squareSandbox: squareSandbox === true || squareSandbox === 'true'
    },
    create: {
      id: 'default',
      enabled: paymentsEnabled === true || paymentsEnabled === 'true',
      stripeEnabled: stripeEnabled === true || stripeEnabled === 'true',
      stripePublishableKey: stripePublishableKey || '',
      stripeTestMode: stripeTestMode === true || stripeTestMode === 'true',
      paypalEnabled: paypalEnabled === true || paypalEnabled === 'true',
      paypalClientId: paypalClientId || '',
      paypalSandbox: paypalSandbox === true || paypalSandbox === 'true',
      squareEnabled: squareEnabled === true || squareEnabled === 'true',
      squareAppId: squareAppId || '',
      squareSandbox: squareSandbox === true || squareSandbox === 'true'
    }
  });

  if (req.headers.accept?.includes('application/json')) {
    return res.json({ success: true });
  }
  res.redirect(`/SalonSales/admin/settings?token=${req.query.token}`);
});

// Separate endpoints for AJAX saves
router.post('/admin/settings/store-info', requireAuth, async (req, res) => {
  const { businessName, tagline, description, address, phone, email, website, businessHours, timezone } = req.body;
  await prisma.storeInfo.upsert({
    where: { id: 'default' },
    update: { businessName, tagline, description, address, phone, email, website, businessHours, timezone },
    create: { id: 'default', businessName, tagline, description, address, phone, email, website, businessHours, timezone }
  });
  res.json({ success: true });
});

router.post('/admin/settings/branding', requireAuth, async (req, res) => {
  const { logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor, headingFont, bodyFont } = req.body;
  await prisma.branding.upsert({
    where: { id: 'default' },
    update: { logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor, headingFont, bodyFont },
    create: { id: 'default', logoUrl, faviconUrl, primaryColor, secondaryColor, accentColor, headingFont, bodyFont }
  });
  res.json({ success: true });
});

router.post('/admin/settings/payment', requireAuth, async (req, res) => {
  const {
    paymentsEnabled, stripeEnabled, stripePublishableKey, stripeTestMode,
    paypalEnabled, paypalClientId, paypalSandbox,
    squareEnabled, squareAppId, squareSandbox
  } = req.body;
  await prisma.paymentSettings.upsert({
    where: { id: 'default' },
    update: {
      enabled: !!paymentsEnabled,
      stripeEnabled: !!stripeEnabled,
      stripePublishableKey: stripePublishableKey || '',
      stripeTestMode: !!stripeTestMode,
      paypalEnabled: !!paypalEnabled,
      paypalClientId: paypalClientId || '',
      paypalSandbox: !!paypalSandbox,
      squareEnabled: !!squareEnabled,
      squareAppId: squareAppId || '',
      squareSandbox: !!squareSandbox
    },
    create: {
      id: 'default',
      enabled: !!paymentsEnabled,
      stripeEnabled: !!stripeEnabled,
      stripePublishableKey: stripePublishableKey || '',
      stripeTestMode: !!stripeTestMode,
      paypalEnabled: !!paypalEnabled,
      paypalClientId: paypalClientId || '',
      paypalSandbox: !!paypalSandbox,
      squareEnabled: !!squareEnabled,
      squareAppId: squareAppId || '',
      squareSandbox: !!squareSandbox
    }
  });
  res.json({ success: true });
});

// ============================================
// FEATURES
// ============================================

router.get('/admin/features', requireAuth, async (req, res) => {
  const [features, branding] = await Promise.all([
    prisma.features.findFirst(),
    getBranding()
  ]);
  res.render('admin/features', { token: req.query.token, basePath, branding, features });
});

router.post('/admin/features', requireAuth, async (req, res) => {
  const {
    faqEnabled, stickyBarEnabled, stickyBarText, stickyBarColor, stickyBarLink, stickyBarLinkText,
    liveChatEnabled, chatProvider, chatWelcomeMessage, chatAgentName, chatWidgetColor, chatPosition,
    chatShowOnMobile, chatWidgetId, chatEmbedCode,
    emailNotifications, smsNotifications, pushNotifications, orderConfirmations, marketingEmails, appointmentReminders,
    facebookUrl, twitterUrl, instagramUrl, linkedinUrl, youtubeUrl, tiktokUrl,
    shareOnFacebook, shareOnTwitter, shareOnLinkedin, shareOnWhatsapp, shareOnEmail, copyLinkButton
  } = req.body;

  await prisma.features.upsert({
    where: { id: 'default' },
    update: {
      faqEnabled: !!faqEnabled,
      stickyBarEnabled: !!stickyBarEnabled,
      stickyBarText: stickyBarText || '',
      stickyBarBgColor: stickyBarColor || '#db2777',
      stickyBarLink: stickyBarLink || '',
      stickyBarLinkText: stickyBarLinkText || '',
      liveChatEnabled: !!liveChatEnabled,
      chatProvider: chatProvider || 'builtin',
      chatWelcomeMessage: chatWelcomeMessage || 'Hi! How can we help you today?',
      chatAgentName: chatAgentName || 'Support',
      chatWidgetColor: chatWidgetColor || '#db2777',
      chatPosition: chatPosition || 'bottom-right',
      chatShowOnMobile: chatShowOnMobile !== false && chatShowOnMobile !== 'false',
      chatWidgetId: chatWidgetId || '',
      chatEmbedCode: chatEmbedCode || '',
      emailNotifications: !!emailNotifications,
      smsNotifications: !!smsNotifications,
      pushNotifications: !!pushNotifications,
      orderConfirmations: !!orderConfirmations,
      marketingEmails: !!marketingEmails,
      appointmentReminders: !!appointmentReminders,
      facebookUrl: facebookUrl || '',
      twitterUrl: twitterUrl || '',
      instagramUrl: instagramUrl || '',
      linkedinUrl: linkedinUrl || '',
      youtubeUrl: youtubeUrl || '',
      tiktokUrl: tiktokUrl || '',
      shareOnFacebook: !!shareOnFacebook,
      shareOnTwitter: !!shareOnTwitter,
      shareOnLinkedin: !!shareOnLinkedin,
      shareOnWhatsapp: !!shareOnWhatsapp,
      shareOnEmail: !!shareOnEmail,
      copyLinkButton: !!copyLinkButton
    },
    create: {
      id: 'default',
      faqEnabled: !!faqEnabled,
      stickyBarEnabled: !!stickyBarEnabled,
      stickyBarText: stickyBarText || '',
      stickyBarBgColor: stickyBarColor || '#db2777',
      stickyBarLink: stickyBarLink || '',
      stickyBarLinkText: stickyBarLinkText || '',
      liveChatEnabled: !!liveChatEnabled,
      chatProvider: chatProvider || 'builtin',
      chatWelcomeMessage: chatWelcomeMessage || 'Hi! How can we help you today?',
      chatAgentName: chatAgentName || 'Support',
      chatWidgetColor: chatWidgetColor || '#db2777',
      chatPosition: chatPosition || 'bottom-right',
      chatShowOnMobile: chatShowOnMobile !== false && chatShowOnMobile !== 'false',
      chatWidgetId: chatWidgetId || '',
      chatEmbedCode: chatEmbedCode || '',
      emailNotifications: !!emailNotifications,
      smsNotifications: !!smsNotifications,
      pushNotifications: !!pushNotifications,
      orderConfirmations: !!orderConfirmations,
      marketingEmails: !!marketingEmails,
      appointmentReminders: !!appointmentReminders,
      facebookUrl: facebookUrl || '',
      twitterUrl: twitterUrl || '',
      instagramUrl: instagramUrl || '',
      linkedinUrl: linkedinUrl || '',
      youtubeUrl: youtubeUrl || '',
      tiktokUrl: tiktokUrl || '',
      shareOnFacebook: !!shareOnFacebook,
      shareOnTwitter: !!shareOnTwitter,
      shareOnLinkedin: !!shareOnLinkedin,
      shareOnWhatsapp: !!shareOnWhatsapp,
      shareOnEmail: !!shareOnEmail,
      copyLinkButton: !!copyLinkButton
    }
  });

  res.json({ success: true });
});

// ============================================
// VOICES & LANGUAGES
// ============================================

router.get('/admin/voices', requireAuth, async (req, res) => {
  const [config, branding] = await Promise.all([
    prisma.businessConfig.findFirst(),
    getBranding()
  ]);
  const selectedVoice = config?.selectedVoice || 'shimmer';

  let languages = await prisma.supportedLanguage.findMany({ orderBy: { name: 'asc' } });

  if (languages.length === 0) {
    const defaultLangs = [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' }
    ];
    for (const lang of defaultLangs) {
      await prisma.supportedLanguage.create({ data: lang });
    }
    languages = await prisma.supportedLanguage.findMany({ orderBy: { name: 'asc' } });
  }

  res.render('admin/voices', { token: req.query.token, basePath, branding, selectedVoice, languages });
});

router.post('/admin/voices/select', requireAuth, async (req, res) => {
  const { voice } = req.body;
  const validVoices = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'];

  if (!validVoices.includes(voice)) {
    return res.status(400).json({ error: 'Invalid voice' });
  }

  let config = await prisma.businessConfig.findFirst();
  if (config) {
    await prisma.businessConfig.update({ where: { id: config.id }, data: { selectedVoice: voice } });
  } else {
    await prisma.businessConfig.create({ data: { selectedVoice: voice } });
  }

  res.json({ success: true, voice });
});

router.post('/admin/voices/language/:id', requireAuth, async (req, res) => {
  const { enabled } = req.body;
  await prisma.supportedLanguage.update({
    where: { id: req.params.id },
    data: { enabled: !!enabled }
  });
  res.json({ success: true });
});

// ============================================
// GREETING CONFIG
// ============================================

router.get('/admin/greeting', requireAuth, async (req, res) => {
  const [config, branding] = await Promise.all([
    prisma.businessConfig.findFirst(),
    getBranding()
  ]);

  if (!config) {
    await prisma.businessConfig.create({ data: {} });
  }

  res.render('admin/greeting', {
    token: req.query.token,
    basePath,
    branding,
    greeting: config?.greeting || '',
    greetingBusy: config?.greetingBusy || '',
    closingMessage: config?.closingMessage || ''
  });
});

router.post('/admin/greeting', requireAuth, async (req, res) => {
  const { greeting, greetingBusy, closingMessage } = req.body;

  let config = await prisma.businessConfig.findFirst();
  if (config) {
    await prisma.businessConfig.update({
      where: { id: config.id },
      data: { greeting, greetingBusy, closingMessage }
    });
  }

  res.json({ success: true });
});

router.post('/admin/greeting/preview', requireAuth, async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const config = await prisma.businessConfig.findFirst();
    const voice = config?.selectedVoice || 'shimmer';

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3'
      })
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'TTS generation failed' });
    }

    res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-cache' });
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ANALYTICS
// ============================================

router.get('/admin/analytics', requireAuth, async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalCalls,
    completedCalls,
    appointmentsBooked,
    appointmentsCancelled,
    topIntents,
    branding
  ] = await Promise.all([
    prisma.callLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.callLog.count({ where: { createdAt: { gte: thirtyDaysAgo }, outcome: 'completed' } }),
    prisma.appointment.count({ where: { createdAt: { gte: thirtyDaysAgo }, status: 'confirmed' } }),
    prisma.appointment.count({ where: { createdAt: { gte: thirtyDaysAgo }, status: 'cancelled' } }),
    prisma.intentLog.groupBy({
      by: ['intent'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: true,
      orderBy: { _count: { intent: 'desc' } },
      take: 10
    }),
    getBranding()
  ]);

  res.render('admin/analytics', {
    token: req.query.token,
    basePath,
    branding,
    stats: { totalCalls, completedCalls, appointmentsBooked, appointmentsCancelled },
    topIntents
  });
});

// ============================================
// ACCOUNT
// ============================================

router.get('/admin/account', requireAuth, async (req, res) => {
  const [config, branding] = await Promise.all([
    prisma.businessConfig.findFirst(),
    getBranding()
  ]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalCalls] = await Promise.all([
    prisma.callLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
  ]);

  const calls = await prisma.callLog.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { duration: true }
  });
  const totalMinutes = Math.round(calls.reduce((sum, c) => sum + (c.duration || 0), 0) / 60);

  res.render('admin/account', {
    token: req.query.token,
    basePath,
    branding,
    account: {
      salonName: config?.salonName || 'Your Salon',
      email: 'admin@salon.com',
      phone: config?.phone || '',
      plan: 'starter',
      apiToken: process.env.ADMIN_TOKEN || 'sk-xxxx'
    },
    usage: {
      totalCalls,
      callLimit: 500,
      totalMinutes,
      minuteLimit: 1000
    },
    billing: []
  });
});

// ============================================
// WEBHOOKS
// ============================================

router.get('/admin/webhooks', requireAuth, async (req, res) => {
  const [webhooks, branding] = await Promise.all([
    prisma.webhook.findMany({ orderBy: { name: 'asc' } }),
    getBranding()
  ]);
  res.render('admin/webhooks', { token: req.query.token, basePath, branding, webhooks });
});

router.post('/admin/webhooks', requireAuth, async (req, res) => {
  const { name, url, enabled, secret } = req.body;
  await prisma.webhook.upsert({
    where: { name },
    create: { name, url, enabled: enabled === 'true', secret: secret || null },
    update: { url, enabled: enabled === 'true', secret: secret || null }
  });
  res.json({ success: true });
});

router.delete('/admin/webhooks/:name', requireAuth, async (req, res) => {
  await prisma.webhook.delete({ where: { name: req.params.name } });
  res.json({ success: true });
});

// ============================================
// SMS CONFIGURATION
// ============================================

router.get('/admin/sms', requireAuth, async (req, res) => {
  let config = await prisma.smsConfig.findFirst();
  if (!config) {
    config = await prisma.smsConfig.create({ data: {} });
  }
  const [templates, branding] = await Promise.all([
    prisma.smsTemplate.findMany({ orderBy: { name: 'asc' } }),
    getBranding()
  ]);
  res.render('admin/sms', { token: req.query.token, basePath, branding, config, templates });
});

router.post('/admin/sms/config', requireAuth, async (req, res) => {
  const { enabled, fromNumber, appointmentConfirmation, appointmentReminder, reminderHoursBefore, cancellationConfirmation, voicemailNotification, adminAlertNumber } = req.body;

  let config = await prisma.smsConfig.findFirst();
  const data = {
    enabled: enabled === 'true',
    fromNumber: fromNumber || null,
    appointmentConfirmation: appointmentConfirmation === 'true',
    appointmentReminder: appointmentReminder === 'true',
    reminderHoursBefore: parseInt(reminderHoursBefore) || 24,
    cancellationConfirmation: cancellationConfirmation === 'true',
    voicemailNotification: voicemailNotification === 'true',
    adminAlertNumber: adminAlertNumber || null
  };

  if (config) {
    await prisma.smsConfig.update({ where: { id: config.id }, data });
  } else {
    await prisma.smsConfig.create({ data });
  }
  res.json({ success: true });
});

router.post('/admin/sms/template', requireAuth, async (req, res) => {
  const { name, template, enabled } = req.body;
  await prisma.smsTemplate.upsert({
    where: { name },
    create: { name, template, enabled: enabled === 'true' },
    update: { template, enabled: enabled === 'true' }
  });
  res.json({ success: true });
});

// ============================================
// TRANSFER CONFIGURATION
// ============================================

router.get('/admin/transfer', requireAuth, async (req, res) => {
  let config = await prisma.transferConfig.findFirst();
  if (!config) {
    config = await prisma.transferConfig.create({ data: {} });
  }
  const [routes, branding] = await Promise.all([
    prisma.transferRoute.findMany({ orderBy: { name: 'asc' } }),
    getBranding()
  ]);
  res.render('admin/transfer', { token: req.query.token, basePath, branding, config, routes });
});

router.post('/admin/transfer/config', requireAuth, async (req, res) => {
  const { enabled, defaultTransferNumber, transferMessage, noAnswerMessage, voicemailEnabled, voicemailNumber, voicemailGreeting, maxWaitTime } = req.body;

  let config = await prisma.transferConfig.findFirst();
  const data = {
    enabled: enabled === 'true',
    defaultTransferNumber: defaultTransferNumber || null,
    transferMessage: transferMessage || 'No problem — I\'ll connect you with a team member. One moment…',
    noAnswerMessage: noAnswerMessage || 'It looks like all staff are currently assisting other guests.',
    voicemailEnabled: voicemailEnabled === 'true',
    voicemailNumber: voicemailNumber || null,
    voicemailGreeting: voicemailGreeting || 'Please leave a message after the tone.',
    maxWaitTime: parseInt(maxWaitTime) || 30
  };

  if (config) {
    await prisma.transferConfig.update({ where: { id: config.id }, data });
  } else {
    await prisma.transferConfig.create({ data });
  }
  res.json({ success: true });
});

router.post('/admin/transfer/route', requireAuth, async (req, res) => {
  const { name, phoneNumber, description, schedule, enabled } = req.body;
  await prisma.transferRoute.upsert({
    where: { name },
    create: { name, phoneNumber, description: description || null, schedule: schedule || null, enabled: enabled === 'true' },
    update: { phoneNumber, description: description || null, schedule: schedule || null, enabled: enabled === 'true' }
  });
  res.json({ success: true });
});

router.delete('/admin/transfer/route/:name', requireAuth, async (req, res) => {
  await prisma.transferRoute.delete({ where: { name: req.params.name } });
  res.json({ success: true });
});

// ============================================
// DTMF MENU CONFIGURATION
// ============================================

router.get('/admin/dtmf', requireAuth, async (req, res) => {
  let menu = await prisma.dtmfMenu.findFirst();
  if (!menu) {
    menu = await prisma.dtmfMenu.create({ data: {} });
  }
  const [options, branding] = await Promise.all([
    prisma.dtmfOption.findMany({ orderBy: { sortOrder: 'asc' } }),
    getBranding()
  ]);
  res.render('admin/dtmf', { token: req.query.token, basePath, branding, menu, options });
});

router.post('/admin/dtmf/menu', requireAuth, async (req, res) => {
  const { enabled, greeting, timeoutSecs } = req.body;
  let menu = await prisma.dtmfMenu.findFirst();
  const data = {
    enabled: enabled === 'true',
    greeting: greeting || 'Press 1 to book an appointment...',
    timeoutSecs: parseInt(timeoutSecs) || 5
  };
  if (menu) {
    await prisma.dtmfMenu.update({ where: { id: menu.id }, data });
  } else {
    await prisma.dtmfMenu.create({ data });
  }
  res.json({ success: true });
});

router.post('/admin/dtmf/option', requireAuth, async (req, res) => {
  const { digit, label, action, actionValue, enabled, sortOrder } = req.body;
  await prisma.dtmfOption.upsert({
    where: { digit },
    create: { digit, label, action, actionValue: actionValue || null, enabled: enabled === 'true', sortOrder: parseInt(sortOrder) || 0 },
    update: { label, action, actionValue: actionValue || null, enabled: enabled === 'true', sortOrder: parseInt(sortOrder) || 0 }
  });
  res.json({ success: true });
});

router.delete('/admin/dtmf/option/:digit', requireAuth, async (req, res) => {
  await prisma.dtmfOption.delete({ where: { digit: req.params.digit } });
  res.json({ success: true });
});

// ============================================
// AI TOOLS CONFIGURATION
// ============================================

router.get('/admin/tools', requireAuth, async (req, res) => {
  const [tools, branding] = await Promise.all([
    prisma.aiTool.findMany({ orderBy: { category: 'asc' } }),
    getBranding()
  ]);
  res.render('admin/tools', { token: req.query.token, basePath, branding, tools });
});

router.post('/admin/tools', requireAuth, async (req, res) => {
  const { name, displayName, description, enabled, category } = req.body;
  await prisma.aiTool.upsert({
    where: { name },
    create: { name, displayName, description, enabled: enabled === 'true', category: category || 'general' },
    update: { displayName, description, enabled: enabled === 'true', category: category || 'general' }
  });
  res.json({ success: true });
});

router.post('/admin/tools/toggle/:name', requireAuth, async (req, res) => {
  const tool = await prisma.aiTool.findUnique({ where: { name: req.params.name } });
  if (tool) {
    await prisma.aiTool.update({ where: { name: req.params.name }, data: { enabled: !tool.enabled } });
  }
  res.json({ success: true });
});

// ============================================
// AI AGENTS CONFIGURATION
// ============================================

router.get('/admin/agents', requireAuth, async (req, res) => {
  const [agents, branding] = await Promise.all([
    prisma.aiAgent.findMany({ orderBy: { name: 'asc' } }),
    getBranding()
  ]);
  res.render('admin/agents', { token: req.query.token, basePath, branding, agents });
});

router.post('/admin/agents', requireAuth, async (req, res) => {
  const { name, displayName, voice, language, systemPrompt, greeting, tools, isDefault, enabled } = req.body;

  if (isDefault === 'true') {
    await prisma.aiAgent.updateMany({ data: { isDefault: false } });
  }

  await prisma.aiAgent.upsert({
    where: { name },
    create: {
      name,
      displayName,
      voice: voice || 'shimmer',
      language: language || 'en',
      systemPrompt,
      greeting: greeting || null,
      tools: tools || '[]',
      isDefault: isDefault === 'true',
      enabled: enabled === 'true'
    },
    update: {
      displayName,
      voice: voice || 'shimmer',
      language: language || 'en',
      systemPrompt,
      greeting: greeting || null,
      tools: tools || '[]',
      isDefault: isDefault === 'true',
      enabled: enabled === 'true'
    }
  });
  res.json({ success: true });
});

router.delete('/admin/agents/:name', requireAuth, async (req, res) => {
  await prisma.aiAgent.delete({ where: { name: req.params.name } });
  res.json({ success: true });
});

// ============================================
// LOGIC RULES
// ============================================

router.get('/admin/logic', requireAuth, async (req, res) => {
  const [rules, branding] = await Promise.all([
    prisma.logicRule.findMany({ orderBy: { priority: 'asc' } }),
    getBranding()
  ]);
  res.render('admin/logic', { token: req.query.token, basePath, branding, rules });
});

router.post('/admin/logic', requireAuth, async (req, res) => {
  const { name, description, condition, action, actionValue, priority, enabled } = req.body;
  await prisma.logicRule.upsert({
    where: { name },
    create: { name, description: description || null, condition, action, actionValue, priority: parseInt(priority) || 0, enabled: enabled === 'true' },
    update: { description: description || null, condition, action, actionValue, priority: parseInt(priority) || 0, enabled: enabled === 'true' }
  });
  res.json({ success: true });
});

router.delete('/admin/logic/:name', requireAuth, async (req, res) => {
  await prisma.logicRule.delete({ where: { name: req.params.name } });
  res.json({ success: true });
});

// ============================================
// CUSTOM FUNCTIONS & CALENDAR
// ============================================

router.get('/admin/functions', requireAuth, async (req, res) => {
  let calendarConfig = await prisma.calendarConfig.findFirst();
  if (!calendarConfig) {
    calendarConfig = await prisma.calendarConfig.create({ data: {} });
  }
  const [functions, branding] = await Promise.all([
    prisma.customFunction.findMany({ orderBy: { name: 'asc' } }),
    getBranding()
  ]);
  res.render('admin/functions', { token: req.query.token, basePath, branding, calendarConfig, functions });
});

router.post('/admin/functions/calendar', requireAuth, async (req, res) => {
  const { provider, enabled, apiKey, calendarId, clientId, clientSecret, refreshToken, webhookUrl, defaultDuration, bufferTime, workingHours } = req.body;

  let config = await prisma.calendarConfig.findFirst();
  const data = {
    provider: provider || 'internal',
    enabled: enabled === 'true',
    apiKey: apiKey || null,
    calendarId: calendarId || null,
    clientId: clientId || null,
    clientSecret: clientSecret || null,
    refreshToken: refreshToken || null,
    webhookUrl: webhookUrl || null,
    defaultDuration: parseInt(defaultDuration) || 30,
    bufferTime: parseInt(bufferTime) || 15,
    workingHours: workingHours || '{}'
  };

  if (config) {
    await prisma.calendarConfig.update({ where: { id: config.id }, data });
  } else {
    await prisma.calendarConfig.create({ data });
  }
  res.json({ success: true });
});

router.post('/admin/functions', requireAuth, async (req, res) => {
  const { name, displayName, description, type, endpoint, method, timeout, headers, queryParams, parameters, payloadType, customPayload, responseMapping, enabled } = req.body;

  await prisma.customFunction.upsert({
    where: { name },
    create: {
      name, displayName, description, type: type || 'custom', endpoint: endpoint || null,
      method: method || 'POST', timeout: parseInt(timeout) || 120000,
      headers: headers || '{}', queryParams: queryParams || '{}', parameters: parameters || '{}',
      payloadType: payloadType || 'args_only', customPayload: customPayload || null,
      responseMapping: responseMapping || null, enabled: enabled === 'true'
    },
    update: {
      displayName, description, type: type || 'custom', endpoint: endpoint || null,
      method: method || 'POST', timeout: parseInt(timeout) || 120000,
      headers: headers || '{}', queryParams: queryParams || '{}', parameters: parameters || '{}',
      payloadType: payloadType || 'args_only', customPayload: customPayload || null,
      responseMapping: responseMapping || null, enabled: enabled === 'true'
    }
  });
  res.json({ success: true });
});

router.post('/admin/functions/toggle/:name', requireAuth, async (req, res) => {
  const fn = await prisma.customFunction.findUnique({ where: { name: req.params.name } });
  if (fn) {
    await prisma.customFunction.update({ where: { name: req.params.name }, data: { enabled: !fn.enabled } });
  }
  res.json({ success: true });
});

router.delete('/admin/functions/:name', requireAuth, async (req, res) => {
  await prisma.customFunction.delete({ where: { name: req.params.name } });
  res.json({ success: true });
});

// ============================================
// HELP & ABOUT
// ============================================

router.get('/admin/help', requireAuth, async (req, res) => {
  const branding = await getBranding();
  res.render('admin/help', { token: req.query.token, basePath, branding });
});

router.get('/admin/about', requireAuth, async (req, res) => {
  const branding = await getBranding();
  res.render('admin/about', { token: req.query.token, basePath, branding });
});

export default router;
