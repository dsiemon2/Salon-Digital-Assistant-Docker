import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function main() {
  console.log('Seeding XYZ Salon data...');

  // Clear existing data first (order matters for foreign keys)
  await prisma.transcript.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.intentLog.deleteMany({});
  await prisma.citationsLog.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.callLog.deleteMany({});
  await prisma.stylistService.deleteMany({});
  await prisma.stylistAvailability.deleteMany({});
  await prisma.stylist.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.addOn.deleteMany({});
  await prisma.aiScript.deleteMany({});
  await prisma.knowledgeChunk.deleteMany({});
  await prisma.knowledgeDoc.deleteMany({});
  await prisma.supportedLanguage.deleteMany({});

  // Create supported languages (all 24 languages, all enabled - matching SellMeAPenExt exactly)
  const languages = [
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', enabled: true },
    { code: 'zh', name: 'Chinese (Mandarin)', nativeName: '中文', enabled: true },
    { code: 'cs', name: 'Czech', nativeName: 'Čeština', enabled: true },
    { code: 'da', name: 'Danish', nativeName: 'Dansk', enabled: true },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', enabled: true },
    { code: 'en', name: 'English', nativeName: 'English', enabled: true },
    { code: 'fi', name: 'Finnish', nativeName: 'Suomi', enabled: true },
    { code: 'fr', name: 'French', nativeName: 'Français', enabled: true },
    { code: 'de', name: 'German', nativeName: 'Deutsch', enabled: true },
    { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', enabled: true },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית', enabled: true },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', enabled: true },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', enabled: true },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', enabled: true },
    { code: 'ko', name: 'Korean', nativeName: '한국어', enabled: true },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk', enabled: true },
    { code: 'pl', name: 'Polish', nativeName: 'Polski', enabled: true },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', enabled: true },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', enabled: true },
    { code: 'es', name: 'Spanish', nativeName: 'Español', enabled: true },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska', enabled: true },
    { code: 'th', name: 'Thai', nativeName: 'ไทย', enabled: true },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', enabled: true },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', enabled: true }
  ];

  for (const lang of languages) {
    await prisma.supportedLanguage.create({ data: lang });
  }
  console.log(`Created ${languages.length} supported languages (all enabled)`);

  // Create or update Business Config
  await prisma.businessConfig.upsert({
    where: { id: 'default' },
    update: {
      salonName: 'XYZ Salon',
      address: '123 Main Street, Anytown, PA 17101',
      landmark: 'next to Starbucks on the corner',
      phone: '(717) 555-1234',
      website: 'https://xyzsalon.com',
      hoursJson: JSON.stringify({
        'Tuesday': '9:00 AM - 7:00 PM',
        'Wednesday': '9:00 AM - 7:00 PM',
        'Thursday': '9:00 AM - 8:00 PM',
        'Friday': '9:00 AM - 8:00 PM',
        'Saturday': '8:00 AM - 5:00 PM'
      }),
      closedDays: JSON.stringify(['Sunday', 'Monday']),
      cancellationPolicy: 24,
      greeting: 'Thank you for calling XYZ Salon! This is your AI assistant. How can I help you today?',
      greetingBusy: 'Thank you for calling XYZ Salon! Our stylists are currently with guests, but I can help you with booking, questions, or take a message.',
      closingMessage: 'Thank you for calling XYZ Salon! Have a beautiful day!',
      kbMinConfidence: 0.55,
      lowConfidenceAction: 'ask_clarify',
      endingEnabled: true,
      endingMessage: 'Thank you for calling XYZ Salon! We look forward to seeing you soon. Have a beautiful day!'
    },
    create: {
      id: 'default',
      salonName: 'XYZ Salon',
      address: '123 Main Street, Anytown, PA 17101',
      landmark: 'next to Starbucks on the corner',
      phone: '(717) 555-1234',
      website: 'https://xyzsalon.com',
      hoursJson: JSON.stringify({
        'Tuesday': '9:00 AM - 7:00 PM',
        'Wednesday': '9:00 AM - 7:00 PM',
        'Thursday': '9:00 AM - 8:00 PM',
        'Friday': '9:00 AM - 8:00 PM',
        'Saturday': '8:00 AM - 5:00 PM'
      }),
      closedDays: JSON.stringify(['Sunday', 'Monday']),
      cancellationPolicy: 24,
      greeting: 'Thank you for calling XYZ Salon! This is your AI assistant. How can I help you today?',
      greetingBusy: 'Thank you for calling XYZ Salon! Our stylists are currently with guests, but I can help you with booking, questions, or take a message.',
      closingMessage: 'Thank you for calling XYZ Salon! Have a beautiful day!',
      kbMinConfidence: 0.55,
      lowConfidenceAction: 'ask_clarify',
      endingEnabled: true,
      endingMessage: 'Thank you for calling XYZ Salon! We look forward to seeing you soon. Have a beautiful day!'
    }
  });

  console.log('Created business config');

  // Create Stylists
  const stylists = [
    {
      name: 'Sarah Johnson',
      phone: '(717) 555-0001',
      email: 'sarah@xyzsalon.com',
      bio: 'Senior stylist with 15 years of experience specializing in color and highlights.',
      specialties: JSON.stringify(['Color', 'Highlights', 'Balayage', 'Color Correction']),
      active: true
    },
    {
      name: 'Mike Chen',
      phone: '(717) 555-0002',
      email: 'mike@xyzsalon.com',
      bio: 'Master barber and mens styling specialist with precision cutting skills.',
      specialties: JSON.stringify(['Mens Cuts', 'Fades', 'Beard Trim', 'Classic Styles']),
      active: true
    },
    {
      name: 'Jessica Martinez',
      phone: '(717) 555-0003',
      email: 'jessica@xyzsalon.com',
      bio: 'Creative stylist passionate about modern cuts and special occasion styling.',
      specialties: JSON.stringify(['Womens Cuts', 'Updos', 'Bridal', 'Extensions']),
      active: true
    },
    {
      name: 'David Williams',
      phone: '(717) 555-0004',
      email: 'david@xyzsalon.com',
      bio: 'Color specialist and certified Redken colorist.',
      specialties: JSON.stringify(['Color', 'Balayage', 'Ombre', 'Vivid Colors']),
      active: true
    }
  ];

  const createdStylists: any[] = [];
  for (const stylist of stylists) {
    const created = await prisma.stylist.create({
      data: stylist
    });
    createdStylists.push(created);
  }

  console.log(`Created ${createdStylists.length} stylists`);

  // Create stylist availability for each stylist
  // dayOfWeek: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  const daysOfWeek = [
    { name: 'Tuesday', num: 2 },
    { name: 'Wednesday', num: 3 },
    { name: 'Thursday', num: 4 },
    { name: 'Friday', num: 5 },
    { name: 'Saturday', num: 6 }
  ];

  for (const stylist of createdStylists) {
    for (const day of daysOfWeek) {
      const startTime = day.name === 'Saturday' ? '08:00' : '09:00';
      const endTime = day.name === 'Saturday' ? '17:00' : (day.name === 'Thursday' || day.name === 'Friday' ? '20:00' : '19:00');

      await prisma.stylistAvailability.create({
        data: {
          stylistId: stylist.id,
          dayOfWeek: day.num,
          startTime,
          endTime
        }
      });
    }
  }

  console.log('Created stylist availability');

  // Create Services
  const services = [
    // Cut services
    { name: 'Womens Haircut', description: 'Includes consultation, shampoo, cut, and style', category: 'cut', price: 55, duration: 45, priceVaries: false, active: true },
    { name: 'Mens Haircut', description: 'Classic or modern cut with styling', category: 'cut', price: 35, duration: 30, priceVaries: false, active: true },
    { name: 'Kids Haircut', description: 'For children 12 and under', category: 'cut', price: 25, duration: 20, priceVaries: false, active: true },
    { name: 'Bang Trim', description: 'Quick bang trim between cuts', category: 'cut', price: 15, duration: 15, priceVaries: false, active: true },

    // Color services
    { name: 'Single Process Color', description: 'All-over color application', category: 'color', price: 85, duration: 90, priceVaries: true, active: true },
    { name: 'Partial Highlights', description: 'Face-framing highlights or partial foils', category: 'color', price: 95, duration: 90, priceVaries: true, active: true },
    { name: 'Full Highlights', description: 'Full head of foil highlights', category: 'color', price: 145, duration: 120, priceVaries: true, active: true },
    { name: 'Balayage', description: 'Hand-painted highlights for natural sun-kissed look', category: 'color', price: 175, duration: 150, priceVaries: true, active: true },
    { name: 'Color Correction', description: 'Fix previous color issues - consultation required', category: 'color', price: 150, duration: 180, priceVaries: true, active: true },
    { name: 'Root Touch-Up', description: 'Color application to regrowth only', category: 'color', price: 65, duration: 60, priceVaries: false, active: true },

    // Treatment services
    { name: 'Deep Conditioning Treatment', description: 'Intensive moisture treatment for dry or damaged hair', category: 'treatment', price: 35, duration: 30, priceVaries: false, active: true },
    { name: 'Keratin Treatment', description: 'Smoothing treatment for frizz-free hair', category: 'treatment', price: 250, duration: 180, priceVaries: true, active: true },
    { name: 'Scalp Treatment', description: 'Relaxing treatment for scalp health', category: 'treatment', price: 45, duration: 30, priceVaries: false, active: true },

    // Styling services
    { name: 'Blowout', description: 'Shampoo and professional blow dry styling', category: 'styling', price: 45, duration: 45, priceVaries: false, active: true },
    { name: 'Special Occasion Style', description: 'Updo or special styling for events', category: 'styling', price: 75, duration: 60, priceVaries: true, active: true },
    { name: 'Bridal Hair', description: 'Wedding day styling - trial included', category: 'styling', price: 150, duration: 90, priceVaries: true, active: true },

    // Other services
    { name: 'Beard Trim', description: 'Shape and trim for well-groomed beard', category: 'other', price: 20, duration: 15, priceVaries: false, active: true },
    { name: 'Eyebrow Wax', description: 'Shape and clean up eyebrows', category: 'other', price: 18, duration: 15, priceVaries: false, active: true }
  ];

  const createdServices: any[] = [];
  for (const service of services) {
    const created = await prisma.service.upsert({
      where: { name: service.name },
      update: service,
      create: service
    });
    createdServices.push(created);
  }

  console.log(`Created ${createdServices.length} services`);

  // Link services to stylists based on their specialties
  await prisma.stylistService.deleteMany({});

  // Sarah - Color specialist
  const sarahServices = ['Womens Haircut', 'Single Process Color', 'Partial Highlights', 'Full Highlights', 'Balayage', 'Color Correction', 'Root Touch-Up', 'Blowout'];
  // Mike - Mens specialist
  const mikeServices = ['Mens Haircut', 'Kids Haircut', 'Bang Trim', 'Beard Trim', 'Blowout'];
  // Jessica - Creative/Bridal specialist
  const jessicaServices = ['Womens Haircut', 'Bang Trim', 'Blowout', 'Special Occasion Style', 'Bridal Hair', 'Deep Conditioning Treatment'];
  // David - Color specialist
  const davidServices = ['Womens Haircut', 'Mens Haircut', 'Single Process Color', 'Partial Highlights', 'Full Highlights', 'Balayage', 'Root Touch-Up', 'Deep Conditioning Treatment', 'Blowout'];

  const stylistServiceMap: Record<string, string[]> = {
    'sarah@xyzsalon.com': sarahServices,
    'mike@xyzsalon.com': mikeServices,
    'jessica@xyzsalon.com': jessicaServices,
    'david@xyzsalon.com': davidServices
  };

  for (const stylist of createdStylists) {
    const serviceNames = stylistServiceMap[stylist.email] || [];
    for (const serviceName of serviceNames) {
      const service = createdServices.find(s => s.name === serviceName);
      if (service) {
        await prisma.stylistService.create({
          data: {
            stylistId: stylist.id,
            serviceId: service.id
          }
        });
      }
    }
  }

  console.log('Linked services to stylists');

  // Create Add-Ons
  const addOns = [
    { name: 'Deep Conditioning Add-On', description: 'Add intensive moisture treatment to any service', price: 25, duration: 15, suggestFor: JSON.stringify(['color', 'treatment']), active: true },
    { name: 'Olaplex Treatment', description: 'Bond-building treatment for healthier hair', price: 35, duration: 15, suggestFor: JSON.stringify(['color']), active: true },
    { name: 'Gloss Treatment', description: 'Add shine and tone to your color', price: 30, duration: 20, suggestFor: JSON.stringify(['color']), active: true },
    { name: 'Scalp Massage', description: 'Relaxing scalp massage during service', price: 15, duration: 10, suggestFor: JSON.stringify(['cut', 'styling']), active: true },
    { name: 'Bang Trim Add-On', description: 'Quick bang trim with any service', price: 10, duration: 10, suggestFor: JSON.stringify(['color', 'styling']), active: true }
  ];

  for (const addOn of addOns) {
    await prisma.addOn.upsert({
      where: { name: addOn.name },
      update: addOn,
      create: addOn
    });
  }

  console.log(`Created ${addOns.length} add-ons`);

  // Create AI Scripts
  const scripts = [
    // Greeting scripts
    { name: 'greeting_default', title: 'Default Greeting', category: 'greeting', content: 'Thank you for calling {{salonName}}! This is your AI assistant. How can I help you today?', isDefault: true, enabled: true },
    { name: 'greeting_busy', title: 'Busy Hours Greeting', category: 'greeting', content: 'Thank you for calling {{salonName}}! Our stylists are currently with guests, but I can help you with booking, answer questions, or take a message. How can I assist you?', isDefault: false, enabled: true },

    // Booking scripts
    { name: 'booking_ask_service', title: 'Ask Service', category: 'booking', content: 'What service would you like to book today?', isDefault: true, enabled: true },
    { name: 'booking_ask_stylist', title: 'Ask Stylist Preference', category: 'booking', content: 'Do you have a preferred stylist, or would you like me to find the first available?', isDefault: false, enabled: true },
    { name: 'booking_ask_time', title: 'Ask Time Preference', category: 'booking', content: 'What day and time works best for you? We are open Tuesday through Saturday.', isDefault: false, enabled: true },
    { name: 'booking_confirm', title: 'Booking Confirmation', category: 'booking', content: 'I have you booked for {{serviceName}} with {{stylistName}} on {{appointmentDate}} at {{appointmentTime}}. Can I get a phone number to send you a confirmation text?', isDefault: false, enabled: true },

    // Reschedule scripts
    { name: 'reschedule_lookup', title: 'Reschedule Lookup', category: 'reschedule', content: 'I would be happy to help you reschedule. Can I get your name or phone number to look up your appointment?', isDefault: true, enabled: true },
    { name: 'reschedule_confirm', title: 'Reschedule Confirmation', category: 'reschedule', content: 'I have rescheduled your {{serviceName}} appointment to {{appointmentDate}} at {{appointmentTime}} with {{stylistName}}.', isDefault: false, enabled: true },

    // Cancel scripts
    { name: 'cancel_lookup', title: 'Cancel Lookup', category: 'cancel', content: 'I can help you cancel your appointment. Can I get your name or phone number to look it up?', isDefault: true, enabled: true },
    { name: 'cancel_policy', title: 'Cancellation Policy Notice', category: 'cancel', content: 'I see your appointment is within 24 hours. Our cancellation policy requires 24 hours notice. Would you still like to proceed with the cancellation?', isDefault: false, enabled: true },
    { name: 'cancel_confirm', title: 'Cancel Confirmation', category: 'cancel', content: 'Your appointment has been cancelled. Would you like to rebook for another time?', isDefault: false, enabled: true },

    // Pricing scripts
    { name: 'pricing_service', title: 'Service Pricing', category: 'pricing', content: 'Our {{serviceName}} starts at ${{price}} and takes about {{duration}} minutes.', isDefault: true, enabled: true },
    { name: 'pricing_varies', title: 'Price Varies Notice', category: 'pricing', content: 'Pricing for {{serviceName}} varies based on hair length and condition, starting at ${{price}}. Would you like to schedule a consultation?', isDefault: false, enabled: true },

    // Hours scripts
    { name: 'hours_regular', title: 'Regular Hours', category: 'hours', content: 'We are open Tuesday through Friday from 9 AM to 7 PM, Thursday and Friday until 8 PM, and Saturday from 8 AM to 5 PM. We are closed Sunday and Monday.', isDefault: true, enabled: true },

    // Location scripts
    { name: 'location_address', title: 'Location Address', category: 'location', content: 'We are located at {{address}}, {{landmark}}. Would you like me to text you the address?', isDefault: true, enabled: true },

    // Stylist scripts
    { name: 'stylist_availability', title: 'Stylist Availability', category: 'stylist', content: '{{stylistName}} is available on {{availableDays}}. Would you like me to book an appointment?', isDefault: true, enabled: true },
    { name: 'stylist_specialty', title: 'Stylist Specialty', category: 'stylist', content: '{{stylistName}} specializes in {{specialties}}.', isDefault: false, enabled: true },

    // Add-on scripts
    { name: 'addon_suggest', title: 'Suggest Add-On', category: 'add_on', content: 'Would you like to add a {{addOnName}} to your service today? It is just ${{addOnPrice}} extra.', isDefault: true, enabled: true },

    // Edge case scripts
    { name: 'edge_spam', title: 'Spam Call Response', category: 'edge_case', content: 'I appreciate you reaching out, but we are not interested at this time. Thank you, goodbye.', isDefault: false, enabled: true },
    { name: 'edge_transfer', title: 'Transfer to Human', category: 'edge_case', content: 'I understand you would like to speak with someone directly. Let me connect you with our team. Please hold for just a moment.', isDefault: false, enabled: true },
    { name: 'edge_voicemail', title: 'Voicemail Offer', category: 'edge_case', content: 'I am not able to answer that question right now. Would you like to leave a message and have someone call you back?', isDefault: false, enabled: true },

    // Closing scripts
    { name: 'closing_default', title: 'Default Closing', category: 'closing', content: 'Thank you for calling {{salonName}}! We look forward to seeing you. Have a beautiful day!', isDefault: true, enabled: true },
    { name: 'closing_booked', title: 'Closing After Booking', category: 'closing', content: 'Your appointment is all set! You will receive a text confirmation shortly. Thank you for choosing {{salonName}}, and we will see you soon!', isDefault: false, enabled: true }
  ];

  for (const script of scripts) {
    await prisma.aiScript.upsert({
      where: { name: script.name },
      update: script,
      create: script
    });
  }

  console.log(`Created ${scripts.length} AI scripts`);

  // Create some sample appointments
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(9, 0, 0, 0);

  // Find services and stylists for sample appointments
  const womensHaircut = createdServices.find(s => s.name === 'Womens Haircut');
  const mensHaircut = createdServices.find(s => s.name === 'Mens Haircut');
  const balayage = createdServices.find(s => s.name === 'Balayage');
  const sarah = createdStylists.find(s => s.email === 'sarah@xyzsalon.com');
  const mike = createdStylists.find(s => s.email === 'mike@xyzsalon.com');
  const jessica = createdStylists.find(s => s.email === 'jessica@xyzsalon.com');

  if (womensHaircut && sarah) {
    await prisma.appointment.create({
      data: {
        customerName: 'Emily Thompson',
        customerPhone: '(717) 555-8001',
        customerEmail: 'emily.t@email.com',
        serviceId: womensHaircut.id,
        stylistId: sarah.id,
        appointmentDate: tomorrow,
        duration: womensHaircut.duration,
        status: 'confirmed',
        confirmationCode: generateConfirmationCode(),
        notes: 'First time client, referred by Lisa'
      }
    });
  }

  const tomorrowAfternoon = new Date(tomorrow);
  tomorrowAfternoon.setHours(14, 0, 0, 0);

  if (mensHaircut && mike) {
    await prisma.appointment.create({
      data: {
        customerName: 'James Wilson',
        customerPhone: '(717) 555-8002',
        serviceId: mensHaircut.id,
        stylistId: mike.id,
        appointmentDate: tomorrowAfternoon,
        duration: mensHaircut.duration,
        status: 'confirmed',
        confirmationCode: generateConfirmationCode(),
        notes: 'Regular client, prefers fade'
      }
    });
  }

  if (balayage && sarah) {
    await prisma.appointment.create({
      data: {
        customerName: 'Amanda Garcia',
        customerPhone: '(717) 555-8003',
        customerEmail: 'amanda.g@email.com',
        serviceId: balayage.id,
        stylistId: sarah.id,
        appointmentDate: nextWeek,
        duration: balayage.duration,
        status: 'confirmed',
        confirmationCode: generateConfirmationCode(),
        notes: 'Wants natural-looking highlights'
      }
    });
  }

  const nextWeekLater = new Date(nextWeek);
  nextWeekLater.setHours(11, 0, 0, 0);

  if (womensHaircut && jessica) {
    await prisma.appointment.create({
      data: {
        customerName: 'Rachel Brown',
        customerPhone: '(717) 555-8004',
        serviceId: womensHaircut.id,
        stylistId: jessica.id,
        appointmentDate: nextWeekLater,
        duration: womensHaircut.duration,
        status: 'confirmed',
        confirmationCode: generateConfirmationCode()
      }
    });
  }

  console.log('Created sample appointments');

  // Create knowledge base documents (FAQs)
  const kbDocs = [
    {
      title: 'Walk-ins Policy',
      slug: 'walk-ins',
      language: 'en',
      content: `# Walk-ins Policy

We do accept walk-ins when our stylists have availability, but we recommend booking an appointment to guarantee your spot. You can call us or book online at xyzsalon.com.`
    },
    {
      title: 'Payment Methods',
      slug: 'payment-methods',
      language: 'en',
      content: `# Payment Methods

We accept cash, all major credit cards, Apple Pay, and Google Pay.`
    },
    {
      title: 'Gift Cards',
      slug: 'gift-cards',
      language: 'en',
      content: `# Gift Cards

Yes! We offer gift cards in any amount. They can be purchased in-salon or over the phone. Gift cards never expire and can be used for any service or product.`
    },
    {
      title: 'Hair Products',
      slug: 'products',
      language: 'en',
      content: `# Hair Products

We are proud to use and sell Redken, Olaplex, and Moroccan Oil products. Our stylists can recommend the best products for your hair type.`
    },
    {
      title: 'Hair Extensions',
      slug: 'extensions',
      language: 'en',
      content: `# Hair Extensions

Yes, we offer both tape-in and hand-tied extensions. A consultation is required before booking. Pricing starts at $300 plus the cost of hair.

Our extension specialists will work with you to find the perfect match for your hair color and texture.`
    },
    {
      title: 'Cancellation Policy',
      slug: 'cancellation-policy',
      language: 'en',
      content: `# Cancellation Policy

We require 24 hours notice for cancellations. Late cancellations or no-shows may be charged a fee equal to 50% of the service price.

We understand that emergencies happen. If you need to cancel with less than 24 hours notice due to an emergency, please call us as soon as possible.`
    },
    {
      title: 'Parking Information',
      slug: 'parking',
      language: 'en',
      content: `# Parking Information

Yes, we have a free parking lot behind the building. There is also street parking available on Main Street.

Look for the blue XYZ Salon sign at the entrance to the parking lot.`
    },
    {
      title: 'Kids Haircuts',
      slug: 'kids-haircuts',
      language: 'en',
      content: `# Kids Haircuts

Yes, we love our little clients! Kids haircuts are $25 for children 12 and under.

We recommend booking during quieter times if your child is nervous about haircuts. Our stylists are experienced with children and will make the experience fun!`
    }
  ];

  for (const doc of kbDocs) {
    await prisma.knowledgeDoc.create({
      data: doc
    });
  }

  console.log(`Created ${kbDocs.length} knowledge base documents`);

  // Create sample call logs for analytics
  const callLogs = [];
  for (let i = 0; i < 15; i++) {
    const daysAgo = Math.floor(Math.random() * 14);
    const callDate = new Date();
    callDate.setDate(callDate.getDate() - daysAgo);
    callDate.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0);

    const outcomes = ['completed', 'completed', 'completed', 'appointment_booked', 'appointment_booked', 'voicemail', 'transferred'];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    const call = await prisma.callLog.create({
      data: {
        callSid: `CA${Date.now()}${i}${Math.random().toString(36).substring(7)}`,
        fromNumber: `+1717555${String(1000 + i).padStart(4, '0')}`,
        toNumber: '+17175551234',
        callerName: ['John', 'Sarah', 'Mike', 'Emily', 'David', 'Lisa', 'Tom', 'Anna'][i % 8],
        duration: Math.floor(Math.random() * 300) + 30,
        startedAt: callDate,
        endedAt: new Date(callDate.getTime() + (Math.floor(Math.random() * 300) + 30) * 1000),
        outcome
      }
    });
    callLogs.push(call);
  }
  console.log(`Created ${callLogs.length} call logs`);

  // Create intent logs for analytics
  const intents = ['booking', 'pricing', 'hours', 'location', 'reschedule', 'cancel', 'stylist_info', 'add_on'];
  for (const call of callLogs) {
    const numIntents = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < numIntents; j++) {
      await prisma.intentLog.create({
        data: {
          callLogId: call.id,
          intent: intents[Math.floor(Math.random() * intents.length)],
          meta: JSON.stringify({})
        }
      });
    }
  }
  console.log('Created intent logs');

  // Create sample transcripts for calls
  for (const call of callLogs.slice(0, 5)) {
    await prisma.transcript.create({
      data: {
        callLogId: call.id,
        text: `Customer called about ${intents[Math.floor(Math.random() * intents.length)]}. AI assistant helped with their request.`
      }
    });
  }
  console.log('Created sample transcripts');

  // Create Branding with Pink colors
  await prisma.branding.upsert({
    where: { id: 'default' },
    update: {
      primaryColor: '#db2777',
      secondaryColor: '#be185d',
      accentColor: '#ec4899',
      headingFont: 'Inter',
      bodyFont: 'Inter'
    },
    create: {
      id: 'default',
      logoUrl: '',
      faviconUrl: '',
      primaryColor: '#db2777',
      secondaryColor: '#be185d',
      accentColor: '#ec4899',
      headingFont: 'Inter',
      bodyFont: 'Inter'
    }
  });
  console.log('Created branding with Pink colors (#db2777)');

  // Create StoreInfo with Salon details
  await prisma.storeInfo.upsert({
    where: { id: 'default' },
    update: {
      businessName: 'XYZ Salon',
      tagline: 'Where Beauty Meets Style',
      description: 'AI-powered salon booking assistant providing 24/7 appointment scheduling, pricing information, and personalized service recommendations.',
      address: '123 Main Street, Anytown, PA 17101',
      phone: '(717) 555-1234',
      email: 'info@xyzsalon.com',
      website: 'https://xyzsalon.com',
      businessHours: 'Tue-Fri 9AM-7PM, Thu-Fri until 8PM, Sat 8AM-5PM',
      timezone: 'America/New_York'
    },
    create: {
      id: 'default',
      businessName: 'XYZ Salon',
      tagline: 'Where Beauty Meets Style',
      description: 'AI-powered salon booking assistant providing 24/7 appointment scheduling, pricing information, and personalized service recommendations.',
      address: '123 Main Street, Anytown, PA 17101',
      phone: '(717) 555-1234',
      email: 'info@xyzsalon.com',
      website: 'https://xyzsalon.com',
      businessHours: 'Tue-Fri 9AM-7PM, Thu-Fri until 8PM, Sat 8AM-5PM',
      timezone: 'America/New_York'
    }
  });
  console.log('Created StoreInfo with Salon details');

  // Create Features
  await prisma.features.upsert({
    where: { id: 'default' },
    update: {
      faqEnabled: true,
      stickyBarEnabled: false,
      stickyBarText: 'Book your first appointment and get 20% off!',
      stickyBarBgColor: '#db2777',
      liveChatEnabled: false,
      chatProvider: 'builtin',
      chatWelcomeMessage: 'Hi! How can we help you with your beauty needs today?',
      chatAgentName: 'Salon Concierge',
      chatWidgetColor: '#db2777',
      chatPosition: 'bottom-right',
      emailNotifications: true,
      smsNotifications: true,
      appointmentReminders: true,
      orderConfirmations: true
    },
    create: {
      id: 'default',
      faqEnabled: true,
      stickyBarEnabled: false,
      stickyBarText: 'Book your first appointment and get 20% off!',
      stickyBarBgColor: '#db2777',
      liveChatEnabled: false,
      chatProvider: 'builtin',
      chatWelcomeMessage: 'Hi! How can we help you with your beauty needs today?',
      chatAgentName: 'Salon Concierge',
      chatWidgetColor: '#db2777',
      chatPosition: 'bottom-right',
      emailNotifications: true,
      smsNotifications: true,
      appointmentReminders: true,
      orderConfirmations: true
    }
  });
  console.log('Created Features');

  // Create PaymentSettings
  await prisma.paymentSettings.upsert({
    where: { id: 'default' },
    update: {
      enabled: false,
      stripeEnabled: false,
      stripeTestMode: true,
      paypalEnabled: false,
      paypalSandbox: true,
      squareEnabled: false,
      squareSandbox: true
    },
    create: {
      id: 'default',
      enabled: false,
      stripeEnabled: false,
      stripeTestMode: true,
      paypalEnabled: false,
      paypalSandbox: true,
      squareEnabled: false,
      squareSandbox: true
    }
  });
  console.log('Created PaymentSettings');

  console.log('\nXYZ Salon seed data complete!');
  console.log('========================================');
  console.log('Admin URL: http://localhost:8083/SalonSales/admin?token=admin');
  console.log('========================================');
}

main()
  .catch(e => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
