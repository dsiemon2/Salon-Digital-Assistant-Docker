# Implementation Plan - XYZ Salon Digital Voice Assistant

## Goal

Deploy a production voice assistant that allows callers to:
1. Get service information (types, pricing, availability)
2. Book appointments with credit card payment
3. Learn about packages and memberships
4. Hear about special offers and promotions
5. Get stylist information
6. Leave voicemails or transfer to humans

---

## Milestone 0: Project Setup & Infrastructure

### Tasks
- [ ] Initialize Node.js + TypeScript project
- [ ] Set up ESLint, Prettier, and TypeScript config
- [ ] Create Express server with `/healthz` endpoint
- [ ] Add Docker Compose (Postgres, Redis)
- [ ] Configure Prisma ORM with initial schema
- [ ] Create `.env.example` with all required variables
- [ ] Set up ngrok or public URL configuration

### Acceptance Criteria
- `GET /healthz` returns 200
- Database migrations run successfully
- Docker containers start without errors

---

## Milestone 1: Twilio Integration & Basic IVR

### Tasks
- [ ] Purchase/configure Twilio voice number
- [ ] Implement `/voice` webhook → TwiML greeting
- [ ] Implement `/voice/route` for DTMF menu:
  - Press 1: Service information
  - Press 2: Book appointment
  - Press 3: Packages and memberships
  - Press 4: Special offers
  - Press 5: Stylist information
  - Press 0: Speak to someone
- [ ] Implement `/voice/voicemail` callback
- [ ] Set up Twilio status callbacks

### Acceptance Criteria
- Call the number → hear greeting
- DTMF routes work correctly
- Voicemail records and stores transcript

---

## Milestone 2: OpenAI Realtime Voice Integration

### Tasks
- [ ] Enable Twilio Media Streams
- [ ] Implement WebSocket bridge (`/media` endpoint)
- [ ] Configure OpenAI Realtime client:
  - Audio format: μ-law ↔ PCM16/16k conversion
  - Voice: Configure TTS voice
  - Turn detection: Server VAD
- [ ] Wire up basic tools:
  - `getServiceInfo()` - Return available services
  - `getServicePricing()` - Return service pricing
  - `getPackageInfo()` - Return package and membership options
  - `getSpecialOffers()` - Return current promotions
  - `getStylistInfo()` - Return stylist information
  - `transferToHuman()` - Transfer to live agent
  - `takeVoicemail()` - Record voicemail

### Acceptance Criteria
- Natural voice conversation works
- Tools execute and return correct information
- Barge-in (interruption) works smoothly

---

## Milestone 3: Knowledge Base & FAQ

### Tasks
- [x] Create Prisma models: `KnowledgeDoc`, `KnowledgeChunk`, `SupportedLanguage`
- [x] Build knowledge base indexer (OpenAI text-embedding-3-small)
- [x] Create FAQ markdown files:
  - `services.md` - Service types and descriptions
  - `pricing.md` - Service pricing and policies
  - `packages.md` - Package and membership options
  - `offers.md` - Special offers and promotions
  - `stylists.md` - Stylist team information
  - `about.md` - XYZ Salon mission
  - `contact.md` - Contact information and hours
- [x] Implement `answerQuestion()` tool with retrieval
- [x] Add spoken citations ("According to our FAQ...")
- [x] Multi-language support: 24 languages with translated KB content
  - English, Spanish, German, Chinese (Mandarin), Vietnamese, French, Italian, Portuguese
  - Japanese, Korean, Arabic, Hindi, Russian, Polish, Dutch, Dutch (Belgium)
  - Ukrainian, Filipino, Tagalog, Nepali, Persian, Galician, Hebrew, Serbian
- [x] Language detection using native names for greeting
- [x] 77+ docs, 90+ chunks across all languages

### Acceptance Criteria
- FAQ questions answered with context
- Citations spoken for grounded answers
- Unknown questions handled gracefully
- Multi-language responses supported

---

## Milestone 4: Stripe Payment Integration

### Tasks
- [ ] Set up Stripe account and API keys
- [ ] Create Prisma models: `Appointment`, `Payment`, `ServiceBooking`
- [ ] Implement payment tools:
  - `startAppointmentBooking()` - Initiate booking flow
  - `collectPaymentInfo()` - Gather card details securely
  - `processPayment()` - Execute Stripe charge
  - `confirmBooking()` - Send confirmation
- [ ] Implement `/stripe/webhook` for payment events
- [ ] Add PCI compliance considerations:
  - Never store full card numbers
  - Use Stripe's tokenization
  - Announce "This call may be recorded"
- [ ] Send SMS/email confirmation after booking

### Acceptance Criteria
- Complete appointment booking via voice
- Payment processed successfully
- Confirmation sent to customer
- Appointment recorded in database

---

## Milestone 5: Admin UI

### Tasks
- [x] Create EJS views with Bootstrap styling
- [x] Implement admin routes (token-gated):
  - `/admin` - Dashboard (stats, recent calls, upcoming appointments)
  - `/admin/calls` - Call logs (caller name, phone, duration, outcome)
  - `/admin/appointments` - View appointment bookings
  - `/admin/services` - Manage services
  - `/admin/packages` - Package and membership management
  - `/admin/offers` - Special offers management
  - `/admin/stylists` - Stylist team information
  - `/admin/kb` - Knowledge base management
  - `/admin/voices` - Voice selection (8 OpenAI voices) and language management (24 languages)
  - `/admin/greeting` - Greeting configuration with preview
  - `/admin/analytics` - Usage analytics
  - `/admin/settings` - Business configuration
  - `/admin/about` - System information
- [x] Add CRUD operations for services
- [x] Add appointment booking reporting
- [x] Add call analytics dashboard
- [x] Add voice selection UI with male/female grouping and avatars
- [x] Add greeting config with character counter and browser TTS preview

### Acceptance Criteria
- Admin can manage services
- Appointment bookings visible in dashboard
- Call logs show conversation history with caller name and duration
- Analytics display useful metrics
- Admin can select assistant voice and enable/disable languages
- Admin can customize greeting message

---

## Milestone 6: Background Jobs & Notifications

### Tasks
- [ ] Set up BullMQ queues:
  - `kb-index` - Knowledge base indexing
  - `transcription` - Voicemail STT
  - `notifications` - Email/SMS sending
  - `payment-confirmation` - Post-purchase actions
- [ ] Implement workers for each queue
- [ ] Add Slack/email notifications for:
  - New voicemails
  - Appointment bookings
  - Membership inquiries
- [ ] Add job retry logic and dead-letter handling

### Acceptance Criteria
- KB articles indexed automatically
- Voicemails transcribed in background
- Notifications sent reliably
- Failed jobs visible in admin

---

## Milestone 7: Testing & QA

### Tasks
- [ ] Unit tests for tools and services
- [ ] Integration tests for Twilio webhooks
- [ ] End-to-end call testing:
  - Service inquiry flow
  - Appointment booking flow (test mode)
  - Package inquiry flow
  - Transfer to human flow
  - Voicemail flow
- [ ] Edge case testing:
  - Noisy environments
  - Unclear speech
  - Interruptions
  - Timeouts
- [ ] Load testing with synthetic calls

### Acceptance Criteria
- All unit tests pass
- E2E scenarios complete successfully
- Edge cases handled gracefully
- Performance meets latency targets (<600ms)

---

## Data Model (Prisma Schema)

```prisma
model Service {
  id          String   @id @default(cuid())
  name        String
  category    String   // Hair, Nails, Skin
  description String?
  price       Decimal
  duration    Int      // in minutes
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  appointments Appointment[]
}

model Appointment {
  id          String   @id @default(cuid())
  serviceId   String
  service     Service  @relation(fields: [serviceId], references: [id])
  stylistName String?
  appointmentDate DateTime
  customerName    String
  customerEmail   String
  customerPhone   String
  paymentId       String?
  paymentStatus   String   // pending, completed, failed, refunded
  confirmationCode String  @unique
  depositAmount   Decimal?
  totalPrice      Decimal
  callLogId       String?
  callLog         CallLog? @relation(fields: [callLogId], references: [id])
  createdAt   DateTime @default(now())
}

model CallLog {
  id          String   @id @default(cuid())
  callSid     String   @unique
  fromNumber  String
  toNumber    String
  startedAt   DateTime @default(now())
  endedAt     DateTime?
  outcome     String?  // completed, voicemail, transferred, appointment_booked
  intents     IntentLog[]
  appointments Appointment[]
  messages    Message[]
  createdAt   DateTime @default(now())
}

model IntentLog {
  id          String   @id @default(cuid())
  callLogId   String
  callLog     CallLog  @relation(fields: [callLogId], references: [id])
  intent      String
  confidence  Float?
  resolved    Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model Message {
  id          String   @id @default(cuid())
  callLogId   String
  callLog     CallLog  @relation(fields: [callLogId], references: [id])
  type        String   // voicemail, membership_inquiry, general
  subject     String?
  body        String
  transcript  String?
  notified    Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model KnowledgeDoc {
  id          String   @id @default(cuid())
  title       String
  content     String
  language    String   @default("en")
  chunks      KnowledgeChunk[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model KnowledgeChunk {
  id          String   @id @default(cuid())
  docId       String
  doc         KnowledgeDoc @relation(fields: [docId], references: [id])
  content     String
  embedding   Float[]
  createdAt   DateTime @default(now())
}

model MembershipInquiry {
  id              String   @id @default(cuid())
  contactName     String
  phone           String
  email           String?
  interestedPackage String?  // bridal, spa_day, color_style, monthly
  notes           String?
  callLogId       String?
  followedUp      Boolean  @default(false)
  createdAt       DateTime @default(now())
}
```

---

## Non-Functional Requirements

### Performance
- Voice response latency: < 600ms end-to-end
- Appointment booking: < 5 seconds
- KB retrieval: < 500ms

### Reliability
- Graceful degradation: DTMF fallback if AI fails
- Payment retry logic with idempotency
- Queue-based processing for resilience

### Security
- PCI DSS considerations for payments
- HTTPS everywhere
- Secrets in environment variables
- Recording disclosure announcement
- PII minimization in logs

### Compliance
- "This call may be recorded" disclosure
- Caller consent for data collection
- Data retention policies

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Caller accent/noise issues | Use OpenAI VAD, confirm critical details verbally |
| Payment failures | Retry logic, offer to call back, store partial orders |
| API outages | Fallback to DTMF menu, queue for retry |
| High call volume | Auto-scaling, queue management, capacity limits |
| Fraudulent payments | Stripe Radar, velocity checks, manual review option |

---

## Definition of Done

- [ ] Phone number accepts calls and converses naturally
- [ ] Callers can hear service information
- [ ] Callers can book appointments with credit card
- [ ] Callers can learn about packages and memberships
- [ ] Callers can hear special offers
- [ ] Callers can get stylist information
- [ ] Callers can leave voicemail or transfer
- [ ] Admin can manage services and view analytics
- [ ] All documentation complete
