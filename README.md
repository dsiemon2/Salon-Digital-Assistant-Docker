# The Soup Cookoff Digital Voice Assistant

A production-ready **digital voice assistant** for The Soup Cookoff nonprofit organization. Callers can ask about events, purchase tickets with credit card, learn about sponsorship opportunities, hear past winners, and more - all through natural voice conversation.

## About The Soup Cookoff

The Soup Cookoff is a soup tasting festival featuring over 20 chefs (professional and amateur) preparing their best soups for attendees to taste and vote on. All proceeds benefit the **AKT Foundation**, a 501(c)(3) nonprofit dedicated to providing essential household necessities to families in extreme poverty and those impacted by domestic violence.

---

## Features

### Core Voice Capabilities
- **Event Information**: "When is the next Soup Cook Off?" / "Where is the next event?"
- **Ticket Purchasing**: Purchase GA or VIP tickets with credit card over the phone
- **Sponsorship Info**: Learn about sponsorship levels ($250-$2,500) and benefits
- **Past Winners**: Hear about previous competition winners
- **Chef Registration**: Information about entering as a Professional, Amateur, or Junior chef
- **FAQ Answering**: Knowledge base retrieval with spoken citations
- **Human Transfer**: Connect to a live person when needed
- **Voicemail**: Leave a message if no one is available

### Technical Features
- **Telephony**: Twilio Programmable Voice (TwiML + Media Streams)
- **Voice AI**: OpenAI Realtime API (low-latency STT <-> LLM <-> TTS)
- **Multi-Language**: 24 languages with translated knowledge base content
- **Voice Selection**: 8 OpenAI voices (male/female) configurable via admin UI
- **Payments**: Stripe integration for secure credit card processing
- **Knowledge Base**: Embedded FAQ with retrieval and citations (77+ docs, 90+ chunks)
- **Admin UI**: Manage events, tickets, FAQ, voices, languages, view analytics
- **Background Jobs**: BullMQ for async processing
- **Stack**: Node.js 20+, TypeScript, Express, Prisma/Postgres, Redis

---

## Upcoming Events

| Event | Date | Location | GA Price | VIP Price |
|-------|------|----------|----------|-----------|
| Carlisle | March 2, 2025 | Carlisle Expo Center | $15/$20 | $30/$35 |
| Harrisburg | October 19, 2025 | Best Western Premier | $15/$20 | $35/$40 |

*Online/Gate pricing shown*

---

## Voice Commands Supported

### Event Inquiries
- "When is the next Soup Cook Off?"
- "Where is the next Soup Cook Off event?"
- "What events do you have coming up?"
- "Tell me about the Harrisburg event"
- "What time does the event start?"

### Ticket Purchasing
- "I'd like to buy tickets"
- "How much are tickets?"
- "What's the difference between GA and VIP?"
- "I want to purchase 2 VIP tickets for Harrisburg"
- "Can I pay with credit card?"

### Sponsorship
- "How do I become a sponsor?"
- "What sponsorship levels are available?"
- "Tell me about the Premium package"
- "I'm interested in sponsoring the event"

### Winners & History
- "Who won the last Soup Cook Off?"
- "Who were the winners?"
- "Tell me about past events"

### Chef Entry
- "How do I enter as a chef?"
- "What are the chef divisions?"
- "How much does it cost to enter as a chef?"
- "I want to register as an amateur chef"

### General
- "What is the AKT Foundation?"
- "Where does the money go?"
- "How can I contact you?"
- "I'd like to speak to someone"
- "Leave a message"

---

## Prerequisites

- **Twilio Account** with Voice-enabled phone number
- **OpenAI API Key** with Realtime API access
- **Stripe Account** for payment processing
- **Docker** (recommended) OR Node.js 20+ with PostgreSQL + Redis
- **ngrok** or public server for Twilio webhooks

---

## Quick Start

```bash
# Clone and setup
cd C:\SCO-Digital-Assistant
cp .env.example .env
# Fill in your API keys (see SETUP_GUIDE.md)

# Start services with Docker
docker compose --profile db --profile redis up -d

# Install and migrate
npm install
npx prisma migrate dev
npm run seed

# Run application
npm run dev          # Web server (terminal 1)
npm run worker       # Background jobs (terminal 2)

# Expose webhooks (terminal 3)
ngrok http 3000
```

Configure your Twilio number:
- **Voice Webhook (POST)**: `https://<ngrok-url>/voice`
- **Status Callback (POST)**: `https://<ngrok-url>/voice/status`

---

## Environment Variables

See `.env.example` for full list. Key variables:

```env
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_VOICE_NUMBER=+1xxxxxxxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxx
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview
OPENAI_TTS_VOICE=alloy

# Stripe (for ticket payments)
STRIPE_SECRET_KEY=sk_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_xxxxx

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/soupcookoff
REDIS_URL=redis://localhost:6379

# Admin
ADMIN_TOKEN=your-secure-token
PUBLIC_BASE_URL=https://your-ngrok-url
```

---

## Supported Languages

The assistant supports 24 languages with translated knowledge base content:

| Language | Native Name | Flag |
|----------|-------------|------|
| English | English | US |
| Spanish | Espanol | ES |
| German | Deutsch | DE |
| Chinese (Mandarin) | Zhongwen | CN |
| Vietnamese | Tieng Viet | VN |
| French | Francais | FR |
| Italian | Italiano | IT |
| Portuguese | Portugues | BR |
| Japanese | Nihongo | JP |
| Korean | Hangugeo | KR |
| Arabic | Arabi | SA |
| Hindi | Hindi | IN |
| Russian | Russkiy | RU |
| Polish | Polski | PL |
| Dutch | Nederlands | NL |
| Dutch (Belgium) | Nederlands (Belgie) | BE |
| Ukrainian | Ukrainska | UA |
| Filipino | Filipino | PH |
| Tagalog | Tagalog | PH |
| Nepali | Nepali | NP |
| Persian | Farsi | IR |
| Galician | Galego | ES |
| Hebrew | Ivrit | IL |
| Serbian | Srpski | RS |

---

## Admin Interface

Access at: `https://<host>/admin?token=YOUR_TOKEN`

- **Dashboard**: Overview stats, recent calls, upcoming events
- **Call Logs**: View call history, caller info, duration, transcripts
- **Tickets**: View sales, manage inventory
- **Events**: Manage upcoming events, dates, locations, pricing
- **Sponsors**: Track sponsorship inquiries
- **Sponsorship Packages**: Configure sponsorship tiers and benefits
- **Winners**: Manage past competition winners
- **Knowledge Base**: Add/edit FAQ content (77+ docs across 24 languages)
- **Voices & Languages**: Select from 8 OpenAI voices, enable/disable 24 languages
- **Greeting Config**: Customize the AI assistant's greeting message with preview
- **Analytics**: Call volume, popular intents, conversion rates
- **Settings**: Business configuration, confidence thresholds
- **About**: System information

---

## Project Structure

```
soup-cookoff-assistant/
├── src/
│   ├── server.ts              # Express bootstrap
│   ├── routes/
│   │   ├── twilioWebhook.ts   # /voice endpoints
│   │   ├── admin.ts           # Admin UI routes
│   │   └── stripe.ts          # Payment webhooks
│   ├── realtime/
│   │   ├── mediaServer.ts     # Twilio <-> OpenAI bridge
│   │   ├── openaiRealtime.ts  # OpenAI client
│   │   └── toolRegistry.ts    # Voice assistant tools
│   ├── services/
│   │   ├── events.ts          # Event management
│   │   ├── tickets.ts         # Ticket sales
│   │   ├── payments.ts        # Stripe integration
│   │   ├── kb.ts              # Knowledge base
│   │   └── sponsors.ts        # Sponsorship handling
│   ├── queues/
│   │   └── worker.ts          # Background jobs
│   └── db/
│       └── schema.prisma      # Database schema
├── kb/                        # Knowledge base markdown files
├── views/                     # Admin UI templates
├── docs/                      # Documentation
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Documentation

- [README.md](README.md) - This file
- [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) - Step-by-step implementation guide
- [ROADMAP.md](docs/ROADMAP.md) - Future features and phases
- [SETUP_GUIDE.md](docs/SETUP_GUIDE.md) - Twilio, OpenAI, Stripe setup instructions
- [KNOWLEDGE_BASE.md](docs/KNOWLEDGE_BASE.md) - FAQ content for voice assistant
- [Q&A_RECOMMENDATIONS.md](docs/Q&A_RECOMMENDATIONS.md) - Recommended Q&A pairs

---

## Support

- **Website**: https://soupcookoff.com
- **Contact Form**: https://soupcookoff.com/contact/
- **Facebook**: https://facebook.com/soupcookoff/
- **Instagram**: https://instagram.com/thesoupcookoff/

---

## License

MIT License - Built for The Soup Cookoff / AKT Foundation

---

## Acknowledgments

Built using the Digital Voice Receptionist framework. All proceeds from The Soup Cookoff benefit the AKT Foundation's mission to help families in need.
