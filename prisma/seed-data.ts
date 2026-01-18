import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with Soup Cookoff data...');

  // ============================================
  // EVENTS
  // ============================================

  // Clear existing events (need to delete tickets first due to FK)
  await prisma.ticketPurchase.deleteMany();
  await prisma.event.deleteMany();

  const events = [
    // Past Events
    {
      name: 'Harrisburg Soup Cookoff - Fall 2024',
      date: new Date('2024-09-29T11:00:00'),
      location: 'Best Western Premier',
      address: '765 Eisenhower Blvd, Harrisburg, PA 17111',
      gaPriceOnline: 15.00,
      gaPriceGate: 20.00,
      vipPriceOnline: 35.00,
      vipPriceGate: 40.00,
      gaCapacity: 600,
      vipCapacity: 75,
      gaSold: 523,
      vipSold: 68,
      active: false, // Past event
    },
    {
      name: 'Carlisle Soup Cookoff - Spring 2025',
      date: new Date('2025-03-02T11:00:00'),
      location: 'Carlisle Expo Center',
      address: '100 K Street, Carlisle, PA 17013',
      gaPriceOnline: 15.00,
      gaPriceGate: 20.00,
      vipPriceOnline: 30.00,
      vipPriceGate: 35.00,
      gaCapacity: 700,
      vipCapacity: 75,
      gaSold: 612,
      vipSold: 71,
      active: false, // Past event
    },
    {
      name: 'Harrisburg Soup Cookoff - Fall 2025',
      date: new Date('2025-10-19T11:00:00'),
      location: 'Best Western Premier',
      address: '765 Eisenhower Blvd, Harrisburg, PA 17111',
      gaPriceOnline: 15.00,
      gaPriceGate: 20.00,
      vipPriceOnline: 35.00,
      vipPriceGate: 40.00,
      gaCapacity: 600,
      vipCapacity: 75,
      gaSold: 487,
      vipSold: 62,
      active: false, // Past event (it's Dec 2025)
    },
    // Future Events
    {
      name: 'Carlisle Soup Cookoff - Spring 2026',
      date: new Date('2026-03-01T11:00:00'),
      location: 'Carlisle Expo Center',
      address: '100 K Street, Carlisle, PA 17013',
      gaPriceOnline: 15.00,
      gaPriceGate: 20.00,
      vipPriceOnline: 30.00,
      vipPriceGate: 35.00,
      gaCapacity: 700,
      vipCapacity: 100,
      gaSold: 156,
      vipSold: 23,
      active: true, // Upcoming event
    },
    {
      name: 'Harrisburg Soup Cookoff - Fall 2026',
      date: new Date('2026-10-18T11:00:00'),
      location: 'Best Western Premier',
      address: '765 Eisenhower Blvd, Harrisburg, PA 17111',
      gaPriceOnline: 15.00,
      gaPriceGate: 20.00,
      vipPriceOnline: 35.00,
      vipPriceGate: 40.00,
      gaCapacity: 600,
      vipCapacity: 100,
      gaSold: 0,
      vipSold: 0,
      active: true, // Upcoming event
    },
  ];

  for (const event of events) {
    await prisma.event.create({ data: event });
    console.log(`Created event: ${event.name}`);
  }

  // ============================================
  // KNOWLEDGE BASE DOCUMENTS
  // ============================================

  // Clear existing knowledge docs and chunks
  await prisma.knowledgeChunk.deleteMany();
  await prisma.knowledgeDoc.deleteMany();

  const knowledgeDocs = [
    {
      title: 'About The Soup Cookoff',
      slug: 'about',
      language: 'en',
      content: `The Soup Cookoff is a bi-annual charity soup tasting event that benefits the AKT Foundation, a 501(c)(3) nonprofit organization. The AKT Foundation's mission is to provide essential household necessities to families in extreme poverty and those impacted by domestic violence.

The event began in 2009 to benefit the Cystic Fibrosis Foundation. In 2018, the Soup Cookoff became a partner of the AKT Foundation and was voted best charity event by Harrisburg Magazine.

At each event, over 20 professional and amateur chefs prepare their best soups for attendees to taste and vote on. We serve over 3,500 gallons of soup across events with 40+ different soups and 700+ attendees per event.

The event emphasizes community participation - YOU are the judge! Attendees receive a spoon, voting card, and brochure at registration. Sample portions of each soup and vote for your favorites.

Voting System:
- 1st Place vote: 3 points
- 2nd Place vote: 2 points
- 3rd Place vote: 1 point

Awards are given in both Professional and Amateur divisions, with People's Choice and Judge's Choice categories.`
    },
    {
      title: 'Event Schedule and Format',
      slug: 'event-format',
      language: 'en',
      content: `The Soup Cookoff events run from 11:00 AM to 3:00 PM.

VIP ticket holders can enter 30 minutes before General Admission (10:30 AM) for early access to taste soups before the crowds.

Event Format:
1. Check in at registration to receive your tasting materials
2. VIP attendees receive: commemorative soup bowl, reusable grocery bag, soup tray, spoon, voting card, and event program
3. General Admission attendees receive: spoon, voting card, and event program
4. Walk around and sample soups from 20+ chefs
5. Mark your votes on your voting card (1st, 2nd, and 3rd place)
6. Turn in your voting card before the deadline
7. Browse vendor booths and silent auction items
8. Winners announced at the end of the event

Events are held twice per year:
- Spring Event: Carlisle Expo Center (March)
- Fall Event: Best Western Premier, Harrisburg (October)`
    },
    {
      title: 'Ticket Information',
      slug: 'tickets',
      language: 'en',
      content: `Ticket Prices:

GENERAL ADMISSION:
- Online: $15
- At the door: $20
- Includes: tasting spoon, voting card, event program

VIP TICKETS:
- Online: $30-35 (varies by event)
- At the door: $35-40 (varies by event)
- Includes: Early entry (30 minutes before GA), commemorative soup bowl, reusable grocery bag, soup tray, spoon, voting card, and event program

Ticket Delivery:
- Tickets purchased more than 10 days before the event will be mailed
- Tickets purchased within 10 days of the event will be held at Will Call

Purchase tickets online at soupcookoff.com/tickets or at the door on event day (cash and card accepted).

Children under 5 are free. We recommend the event for ages 5 and up who enjoy trying different foods.`
    },
    {
      title: 'Sponsorship Opportunities',
      slug: 'sponsorship',
      language: 'en',
      content: `The Soup Cookoff offers four sponsorship packages:

PRESENTING SPONSOR - $2,500 (1 available)
- Up to 10x20 vendor booth at event
- Full page program ad
- Logo on event sponsor banner
- 25 complimentary event tickets
- Social media recognition with website link
- Table card advertising at event
- Public PA announcements (up to 4)
- Promotional items in 75 VIP bags

PREMIUM PACKAGE - $1,000 (4 available)
- 10x10 vendor booth at event
- Full page program ad
- Logo on event sponsor banner
- 20 complimentary event tickets
- Social media recognition with website link
- Public PA announcements (up to 2)
- Promotional items in 75 VIP bags

ECONOMIC PACKAGE - $500 (6 available)
- 10x10 vendor booth at event
- Half-page program ad
- Logo on event sponsor banner
- 10 complimentary event tickets
- Social media recognition with website link
- Promotional items in 75 VIP bags

BASIC PACKAGE - $250 (5 available)
- 6 foot vendor table (no pipe and drapes)
- Business card-sized program ad
- Logo on event sponsor banner
- 5 complimentary event tickets

Standalone vendor tables and brochure advertising are also available separately.

For sponsorship inquiries, visit soupcookoff.com/sponsor or soupcookoff.com/contact.`
    },
    {
      title: 'Chef Registration',
      slug: 'chef-registration',
      language: 'en',
      content: `The Soup Cookoff welcomes chefs to compete in three divisions:

PROFESSIONAL DIVISION
For restaurants, catering companies, and professional chefs. Contact us for pricing and details.

AMATEUR DIVISION
For home cooks and cooking enthusiasts. Registration fee is $25 per event. Show off your best soup recipe and compete for prizes!

JUNIOR DIVISION
For young aspiring chefs. Contact us for details and requirements.

What to Expect as a Chef:
- Prepare enough soup for approximately 400-500 tastings (we'll provide specific quantities)
- Set up your booth with decorations (many chefs theme their booths!)
- Serve samples to attendees throughout the event
- Compete for People's Choice and Judge's Choice awards

Judging Criteria:
- Taste
- Presentation
- Creativity
- Overall Appeal

Register to compete at soupcookoff.com/chef-entry`
    },
    {
      title: 'Contact Information',
      slug: 'contact',
      language: 'en',
      content: `Contact The Soup Cookoff:

Website: soupcookoff.com
Contact Form: soupcookoff.com/contact (responses within 24 hours)

Contact form categories:
- General Information
- Ticket Sales
- Chef Registration
- Sponsorship
- Shop/Product Purchase
- Webmaster
- Press Inquiries

Social Media:
- Facebook: facebook.com/soupcookoff
- Instagram: instagram.com/thesoupcookoff
- Pinterest: pinterest.com/soupcookoff
- YouTube: youtube.com/@soupcookoff
- Reddit: reddit.com/user/SoupCookOff

For sponsorship opportunities, visit soupcookoff.com/sponsor
For tickets, visit soupcookoff.com/tickets
For chef registration, visit soupcookoff.com/chef-entry

The Soup Cookoff benefits the AKT Foundation, a 501(c)(3) nonprofit organization.`
    },
    {
      title: 'AKT Foundation',
      slug: 'akt-foundation',
      language: 'en',
      content: `The AKT Foundation is the beneficiary charity of The Soup Cookoff.

The AKT Foundation is a 501(c)(3) nonprofit organization dedicated to providing essential household necessities to families in extreme poverty and those impacted by domestic violence.

All proceeds from The Soup Cookoff events go directly to supporting the AKT Foundation's mission of helping families in need.

By attending The Soup Cookoff, purchasing tickets, or becoming a sponsor, you are directly supporting families in your community who need help the most.

For more information about the AKT Foundation, visit the About page at soupcookoff.com/about.`
    },
    {
      title: 'Event Locations',
      slug: 'locations',
      language: 'en',
      content: `The Soup Cookoff holds events at two primary locations:

HARRISBURG - FALL EVENTS (October)
Best Western Premier
765 Eisenhower Blvd
Harrisburg, PA 17111

The Best Western Premier offers ample parking and a large event space perfect for our fall soup cookoff. The venue is easily accessible from I-83 and Route 322.

CARLISLE - SPRING EVENTS (March)
Carlisle Expo Center
100 K Street
Carlisle, PA 17013

The Carlisle Expo Center provides a spacious venue for our spring events with plenty of room for vendors, chefs, and attendees. Located just off I-81.

Both venues offer:
- Free parking
- Wheelchair accessibility
- Climate-controlled indoor space
- Convenient central Pennsylvania locations`
    },
    {
      title: 'Past Winners',
      slug: 'winners',
      language: 'en',
      content: `The Soup Cookoff announces winners at each event in multiple categories:

AWARD CATEGORIES:
- People's Choice - Professional Division
- People's Choice - Amateur Division
- Judge's Choice - Professional Division
- Judge's Choice - Amateur Division

Recent Events:
- Harrisburg, October 19, 2025 - Best Western Premier
- Carlisle, March 2, 2025 - Carlisle Expo Center
- Harrisburg, September 29, 2024 - Best Western Premier

For detailed results from past events including all winners and their winning soups, visit soupcookoff.com/winners.

Past champions have featured creative soups like:
- Traditional favorites (chicken noodle, tomato bisque, chili)
- Creative innovations (Thai coconut curry, loaded baked potato, buffalo chicken)
- Regional specialties (Maryland crab, Pennsylvania Dutch pot pie)

Will your soup be the next winner? Register to compete at soupcookoff.com/chef-entry!`
    }
  ];

  for (const doc of knowledgeDocs) {
    const created = await prisma.knowledgeDoc.create({ data: doc });
    console.log(`Created knowledge doc: ${doc.title}`);

    // Create simple chunks for each document (one chunk per paragraph)
    const paragraphs = doc.content.split('\n\n').filter(p => p.trim());
    for (let i = 0; i < paragraphs.length; i++) {
      await prisma.knowledgeChunk.create({
        data: {
          docId: created.id,
          index: i,
          text: paragraphs[i].trim(),
          embedding: '[]' // Empty embedding - will need to be regenerated
        }
      });
    }
  }

  // ============================================
  // BUSINESS CONFIG
  // ============================================

  await prisma.businessConfig.deleteMany();
  await prisma.businessConfig.create({
    data: {
      organizationName: 'XYZ Salon',
      hoursJson: JSON.stringify({
        'Monday - Friday': '9:00 AM - 7:00 PM',
        'Saturday': '9:00 AM - 5:00 PM',
        'Sunday': 'Closed'
      }),
      address: 'Visit xyzsalon.com for our location and services',
      kbMinConfidence: 0.55,
      lowConfidenceAction: 'ask_clarify'
    }
  });
  console.log('Created business config');

  // ============================================
  // SPONSOR INQUIRIES
  // ============================================

  await prisma.sponsorInquiry.deleteMany();

  const sponsors = [
    {
      contactName: 'John Smith',
      companyName: 'Smith\'s Restaurant Supply',
      phone: '+17175551234',
      email: 'john@smithsupply.com',
      interestedTier: 'premium',
      notes: 'Interested in premium package, wants booth near entrance',
      followedUp: true
    },
    {
      contactName: 'Sarah Johnson',
      companyName: 'Central PA Catering',
      phone: '+17175555678',
      email: 'sarah@cpacatering.com',
      interestedTier: 'presenting',
      notes: 'Very interested in presenting sponsor, budget approved',
      followedUp: false
    },
    {
      contactName: 'Mike Williams',
      companyName: 'Williams Family Farm',
      phone: '+17175559012',
      email: 'mike@williamsfarm.com',
      interestedTier: 'economic',
      notes: 'Local farm, wants to showcase organic vegetables',
      followedUp: true
    },
    {
      contactName: 'Lisa Brown',
      companyName: 'Brown\'s Bakery',
      phone: '+17175553456',
      email: 'lisa@brownsbakery.com',
      interestedTier: 'basic',
      notes: 'First-time sponsor, may upgrade next year',
      followedUp: false
    }
  ];

  for (const sponsor of sponsors) {
    await prisma.sponsorInquiry.create({ data: sponsor });
  }
  console.log('Created sponsor inquiries: ' + sponsors.length);

  // ============================================
  // CALL LOGS
  // ============================================

  await prisma.transcript.deleteMany();
  await prisma.callLog.deleteMany();

  const callLogs = [
    {
      callSid: 'test-call-001',
      fromNumber: '+17175551111',
      toNumber: '+17175550000',
      startedAt: new Date('2025-11-15T10:30:00'),
      endedAt: new Date('2025-11-15T10:35:00'),
      outcome: 'completed'
    },
    {
      callSid: 'test-call-002',
      fromNumber: '+17175552222',
      toNumber: '+17175550000',
      startedAt: new Date('2025-11-20T14:15:00'),
      endedAt: new Date('2025-11-20T14:22:00'),
      outcome: 'ticket_purchase'
    },
    {
      callSid: 'test-call-003',
      fromNumber: '+17175553333',
      toNumber: '+17175550000',
      startedAt: new Date('2025-11-25T09:00:00'),
      endedAt: new Date('2025-11-25T09:08:00'),
      outcome: 'completed'
    },
    {
      callSid: 'test-call-004',
      fromNumber: '+17175554444',
      toNumber: '+17175550000',
      startedAt: new Date('2025-12-01T11:45:00'),
      endedAt: new Date('2025-12-01T11:50:00'),
      outcome: 'voicemail'
    }
  ];

  for (const call of callLogs) {
    const created = await prisma.callLog.create({ data: call });
    // Add sample transcripts
    await prisma.transcript.create({
      data: {
        callLogId: created.id,
        text: '[assistant]: Hello and welcome to The Soup Cookoff! How can I assist you today?'
      }
    });
    await prisma.transcript.create({
      data: {
        callLogId: created.id,
        text: '[user]: When is the next soup cookoff event?'
      }
    });
    await prisma.transcript.create({
      data: {
        callLogId: created.id,
        text: '[assistant]: Our next event is the Carlisle Soup Cookoff on March 1, 2026 at the Carlisle Expo Center.'
      }
    });
  }
  console.log('Created call logs: ' + callLogs.length);

  // ============================================
  // TICKET PURCHASES
  // ============================================

  // Already deleted at the start due to FK constraints

  // Get the upcoming event for ticket purchases
  const upcomingEvent = await prisma.event.findFirst({
    where: { active: true },
    orderBy: { date: 'asc' }
  });

  if (upcomingEvent) {
    const tickets = [
      {
        eventId: upcomingEvent.id,
        ticketType: 'GA',
        quantity: 2,
        unitPrice: 15.00,
        totalPrice: 30.00,
        customerName: 'Robert Davis',
        customerEmail: 'robert@email.com',
        customerPhone: '+17175556001',
        paymentStatus: 'completed',
        confirmationCode: 'SCO-GA-001'
      },
      {
        eventId: upcomingEvent.id,
        ticketType: 'VIP',
        quantity: 4,
        unitPrice: 30.00,
        totalPrice: 120.00,
        customerName: 'Jennifer Martinez',
        customerEmail: 'jennifer@email.com',
        customerPhone: '+17175556002',
        paymentStatus: 'completed',
        confirmationCode: 'SCO-VIP-002'
      },
      {
        eventId: upcomingEvent.id,
        ticketType: 'GA',
        quantity: 3,
        unitPrice: 15.00,
        totalPrice: 45.00,
        customerName: 'David Wilson',
        customerEmail: 'david@email.com',
        customerPhone: '+17175556003',
        paymentStatus: 'completed',
        confirmationCode: 'SCO-GA-003'
      },
      {
        eventId: upcomingEvent.id,
        ticketType: 'VIP',
        quantity: 2,
        unitPrice: 30.00,
        totalPrice: 60.00,
        customerName: 'Amanda Taylor',
        customerEmail: 'amanda@email.com',
        customerPhone: '+17175556004',
        paymentStatus: 'pending',
        confirmationCode: 'SCO-VIP-004'
      },
      {
        eventId: upcomingEvent.id,
        ticketType: 'GA',
        quantity: 5,
        unitPrice: 15.00,
        totalPrice: 75.00,
        customerName: 'Chris Anderson',
        customerEmail: 'chris@email.com',
        customerPhone: '+17175556005',
        paymentStatus: 'completed',
        confirmationCode: 'SCO-GA-005'
      }
    ];

    for (const ticket of tickets) {
      await prisma.ticketPurchase.create({ data: ticket });
    }
    console.log('Created ticket purchases: ' + tickets.length);
  }

  // ============================================
  // WINNERS
  // ============================================

  await prisma.winner.deleteMany();

  const winners = [
    // Harrisburg 2025 - Professional Division
    {
      eventName: 'Harrisburg 2025 | Best Western Premier',
      division: 'Professional',
      place: 1,
      chefName: "O'Reilly's Taproom and Kitchen",
      soupName: 'Irish Potato Soup',
      restaurant: "O'Reilly's Pub in Harrisburg"
    },
    {
      eventName: 'Harrisburg 2025 | Best Western Premier',
      division: 'Professional',
      place: 2,
      chefName: 'The Hershey Pantry',
      soupName: 'Jalapeno Popper Soup',
      restaurant: 'The Hershey Pantry'
    },
    {
      eventName: 'Harrisburg 2025 | Best Western Premier',
      division: 'Professional',
      place: 3,
      chefName: "Feeser's Food Distributors",
      soupName: 'Spiced Pumpkin Sausage Bisque',
      restaurant: "Feeser's Food Distributors"
    },
    {
      eventName: 'Harrisburg 2025 | Best Western Premier',
      division: 'Professional',
      place: 4,
      chefName: "O'Reilly's Taproom and Kitchen",
      soupName: 'Premier Chili',
      restaurant: "O'Reilly's Taproom and Kitchen"
    },
    {
      eventName: 'Harrisburg 2025 | Best Western Premier',
      division: 'Professional',
      place: 5,
      chefName: 'Spikefish Catering',
      soupName: 'Loaded Baked Potato Chowder',
      restaurant: 'Spikefish Catering'
    },
    // Harrisburg 2025 - Amateur Division
    {
      eventName: 'Harrisburg 2025 | Best Western Premier',
      division: 'Amateur',
      place: 1,
      chefName: 'Lana Yoder',
      soupName: 'Creamy Pesto with Tortellini',
      restaurant: null
    },
    {
      eventName: 'Harrisburg 2025 | Best Western Premier',
      division: 'Amateur',
      place: 2,
      chefName: 'MK Smith',
      soupName: 'Nacho Average Soup',
      restaurant: null
    },
    {
      eventName: 'Harrisburg 2025 | Best Western Premier',
      division: 'Amateur',
      place: 3,
      chefName: 'Elaine Charest',
      soupName: 'Sesame Chicken Noodle',
      restaurant: null
    },
    {
      eventName: 'Harrisburg 2025 | Best Western Premier',
      division: 'Amateur',
      place: 4,
      chefName: 'Trivia Steve',
      soupName: 'Smoked Brisket & Potato Soup',
      restaurant: null
    },
    {
      eventName: 'Harrisburg 2025 | Best Western Premier',
      division: 'Amateur',
      place: 5,
      chefName: 'Kathy Matoska',
      soupName: 'Sweet n Sassy Chili',
      restaurant: null
    }
  ];

  for (const winner of winners) {
    await prisma.winner.create({ data: winner });
  }
  console.log('Created winners: ' + winners.length);

  // ============================================
  // SPONSORSHIP PACKAGES
  // ============================================

  await prisma.sponsorshipPackage.deleteMany();

  const packages = [
    {
      name: 'Presenting Sponsor',
      subtitle: 'Title Sponsorship',
      price: 2500.00,
      available: 1,
      colorClass: 'primary',
      benefits: JSON.stringify([
        'Up to 10x20 vendor booth',
        'Full page program ad',
        'Logo on event banner',
        '25 complimentary tickets',
        'Social media recognition',
        'Table card advertising',
        'Up to 4 PA announcements',
        'Items in 75 VIP bags'
      ])
    },
    {
      name: 'Premium Package',
      subtitle: 'Featured Sponsor',
      price: 1000.00,
      available: 4,
      colorClass: 'warning',
      benefits: JSON.stringify([
        '10x10 vendor booth',
        'Full page program ad',
        'Logo on event banner',
        '20 complimentary tickets',
        'Social media recognition',
        'Up to 2 PA announcements',
        'Items in 75 VIP bags'
      ])
    },
    {
      name: 'Economic Package',
      subtitle: 'Standard Sponsor',
      price: 500.00,
      available: 6,
      colorClass: 'secondary',
      benefits: JSON.stringify([
        '10x10 vendor booth',
        'Half-page program ad',
        'Logo on event banner',
        '10 complimentary tickets',
        'Social media recognition',
        'Items in 75 VIP bags'
      ])
    },
    {
      name: 'Basic Package',
      subtitle: 'Entry Level',
      price: 250.00,
      available: 5,
      colorClass: 'success',
      benefits: JSON.stringify([
        '6 foot vendor table',
        'Business card program ad',
        'Name on event banner',
        '5 complimentary tickets'
      ])
    }
  ];

  for (const pkg of packages) {
    await prisma.sponsorshipPackage.create({ data: pkg });
  }
  console.log('Created sponsorship packages: ' + packages.length);

  console.log('\nSeed completed successfully!');
  console.log('Events created: 5 (3 past, 2 upcoming)');
  console.log('Knowledge docs created: ' + knowledgeDocs.length);
  console.log('Winners created: ' + winners.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
