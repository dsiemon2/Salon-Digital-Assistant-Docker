# Digital Voice Receptionist — Master Bundle

A turnkey, production-grade **voice receptionist** you can connect to a real phone number. It answers calls, understands the caller, retrieves answers from a knowledge base with citations, books meetings on Google/Microsoft calendars, takes messages with voicemail STT, and **transfers** to a person or department when needed. Includes an **Admin UI**, **analytics**, **jobs dashboard**, and **Docker-first** ops.

## ✨ Features

- **Telephony:** Twilio Programmable Voice (TwiML + Media Streams)
- **Realtime Voice AI:** OpenAI Realtime (low-latency STT ↔ LLM ↔ TTS)
- **Knowledge Base:** Markdown articles → chunked + embedded (OpenAI embeddings) → grounded answers with **spoken citations**
- **Appointments:** Google Calendar (service account) + Microsoft 365 (Graph, client credentials)
- **Transfers:** Live agent & department-based transfer mid-conversation
- **Voicemail → STT:** Whisper transcription in background jobs
- **Admin:** Hours & policy (KB confidence threshold), Departments, Call Logs, Analytics, KB manager, Citations, Jobs
- **Background Jobs:** BullMQ for KB indexing & transcription
- **Stack:** Node 20, TypeScript, Express, Prisma/Postgres, Redis, EJS views, Docker

---

## 🧰 Prerequisites

- Twilio account with a Voice-enabled number
- OpenAI API key
- Docker (recommended) OR Node 20+ with Postgres 16 + Redis 7
- Optional:
  - Google Cloud service account with Calendar access
  - Azure AD App (client credentials) with Graph Calendar permissions
  - ngrok account for public webhooks (or a public host)

---

## ⚙️ Environment Variables

Copy `.env.example` → `.env`, then fill:

### Required
| Key | Description |
| --- | --- |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Twilio credentials (also used to fetch secured recordings) |
| `TWILIO_VOICE_NUMBER` | Your purchased Twilio phone number (E.164) |
| `TWILIO_AGENT_TRANSFER_NUMBER` | Number to dial for live agent |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_REALTIME_MODEL` | e.g. `gpt-4o-realtime-preview` |
| `OPENAI_TTS_VOICE` | e.g. `alloy` |
| `DATABASE_URL` | Postgres URL (compose sets this) |
| `REDIS_URL` | Redis URL (compose sets this) |
| `ADMIN_TOKEN` | Shared token for Admin UI |

### Optional
| Key | Description |
| --- | --- |
| `OPENAI_STT_MODEL` | Whisper STT model for voicemail (default `whisper-1`) |
| `TWILIO_MESSAGING_SERVICE_SID` | Use Messaging Service for SMS instead of `TWILIO_VOICE_NUMBER` |
| `GOOGLE_CALENDAR_SA_B64`, `GOOGLE_CALENDAR_ID` | Google booking via service account (base64 JSON, calendar id) |
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `M365_CALENDAR_USER` | Microsoft Graph booking |
| `PUBLIC_BASE_URL` | Public base URL (e.g., your ngrok url) |
| `NGROK_AUTHTOKEN`, `NGROK_STATIC_DOMAIN` | Optional ngrok compose profile |

---

## 🚀 Quickstart (Docker)

```bash
cp .env.example .env
# Fill Twilio + OpenAI (DB/Redis provided by compose)
docker compose --profile db --profile redis up -d

npm install
npx prisma migrate dev
npm run seed            # seeds departments, hours, KB (enqueues KB indexing)
npm run dev             # web app
npm run worker          # background jobs
# Or run all in Docker:
# npm run compose:all
```

Expose publicly:
- `ngrok http 3000` **or** `docker compose --profile ngrok up` (requires `NGROK_AUTHTOKEN`)
- Twilio Number → **Voice webhook (POST):** `https://<host>/voice`
- Twilio Number → **Status callback (POST):** `https://<host>/voice/status`

Call your number → press **9** for the **realtime assistant**.

---

## 🏗️ Architecture

**Request path (Realtime option):**

```
Caller → Twilio → TwiML <Connect><Stream> → /media (WS)
   ↕ μ-law/PCM16k convert + VAD
OpenAI Realtime WS (tools enabled)
   ↕ tool calls
Node tools: hours / KB / booking / transfer / voicemail
   ↕ DB & external APIs
Postgres (Prisma), Redis (sessions/queues), Google/M365, Twilio API
```

**Key components:**
- `/src/routes/twilioWebhook.ts`: IVR entry (`/voice`), DTMF demo, voicemail handler
- `/src/realtime/mediaServer.ts`: Twilio Media Streams ↔ OpenAI Realtime WS bridge (audio in/out, tool-calls, transfers)
- `/src/realtime/toolRegistry.ts`: Tools (`getPolicy`, `setLanguage`, `answerQuestion`, `bookAppointment`, `transferTo*`, etc.)
- `/src/services/*`: Calendar, KB, booking, transcription helpers
- `/src/queues/*`: BullMQ queues, workers

---

## 🖥️ Admin UI

Visit: `https://<host>/admin?token=YOUR_TOKEN`

- **Hours & Policy:** address, hours JSON, KB confidence threshold, low-confidence action (ask/transfer/voicemail)
- **Departments:** add “Sales”, “Support”, phone numbers used for transfers
- **Call Logs:** last 100 calls
- **Analytics:** calls, transfers, AHT
- **KB & Deflection:** KB usage/deflection % & per-intent volume
- **Knowledge:** add articles (auto-indexed with embeddings)
- **Citations:** KB answers with **per-source confidence**
- **Jobs:** queue counts & recent failures (KB indexing, transcription)

---

## 📚 Knowledge Base

- Place Markdown in `/kb` **or** add via Admin → Knowledge
- Indexer chunks & embeds content (OpenAI **text-embedding-3-small**)
- Retrieval tool (`answerQuestion`) returns **context + sources**; model speaks answer with a brief **citation**

**Confidence gating:** Admin sets `kbMinConfidence` and fallback (`ask_clarify` / `transfer` / `voicemail`). Model calls `getPolicy()` and adapts behavior.

---

## 📅 Bookings

- **Google Calendar:** Base64 service account JSON → `GOOGLE_CALENDAR_SA_B64`; `GOOGLE_CALENDAR_ID` → the target calendar
- **Microsoft 365 Graph:** `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `M365_CALENDAR_USER`
- If neither configured, we **SMS** a Calendly-style link as fallback

---

## 🎧 Voicemail Transcription

- `/voice/voicemail` records; worker fetches the Twilio recording (authenticated) → OpenAI **audio transcriptions** → stores a `Message`
- Extend notifier stubs to email/Slack ops

---

## 🔐 Security Baselines

- Admin UI gated by `ADMIN_TOKEN`
- PII minimization; announce “This call may be recorded”
- Rotate keys; use HTTPS; restrict Admin to VPN/IP allowlist in production
- For recordings, rely on Twilio-authenticated URLs (or signed)

---

## ✅ Testing

- **Unit:** tool functions (KB/booking/transfer)
- **Integration:** Twilio webhook → routes return valid TwiML
- **End-to-end (manual):** Call, press 9, test: hours; KB Q&A + citation; booking; transfer; voicemail
- **Load/soak:** run short synthetic calls to validate worker stability

---

## 🛠 Troubleshooting

- No audio back: check Media Streams region/permissions; ensure μ-law/PCM conversions active
- Realtime connect fails: verify `OPENAI_REALTIME_MODEL` & API key
- Bookings not created: confirm Google/M365 credentials and calendar access
- KB answers weak: index more docs, lower `kbMinConfidence`, or switch fallback to transfer
- Jobs stuck: check Redis, run `npm run worker`, Admin → **Jobs** for failures

---

## 📦 Deploy

See `/docs/deploy.md` for **Railway**, **Render**, and **Azure App Service** recipes. Typical commands:

- Build: `npm ci && npx prisma generate && npm run build`
- Web start: `npx prisma migrate deploy && node dist/server.js`
- Worker start: `node dist/queues/worker.js`
