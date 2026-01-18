# Implementation Plan (Master)

This plan breaks the system into milestones with acceptance criteria, risks, and ops notes. Use it for tracking the rollout from dev → staging → production.

## Milestone 0 — Core plumbing
**Scope**
- Repo, TypeScript, Express, Prisma
- Postgres + Redis via Docker
- Basic health check

**Acceptance**
- `GET /healthz` returns 200
- DB migrations apply cleanly

**Risks**
- None (scaffold only)

---

## Milestone 1 — Telephony MVP
**Scope**
- Twilio `/voice` webhook with DTMF + speech gather
- Options: hours, voicemail, human transfer
- CallLog persistence + status callback

**Acceptance**
- Incoming call reaches menu; options work
- Call logs appear in DB/Admin

**Risks**
- Misconfigured webhooks → 403/timeout

**Mitigation**
- Use ngrok; verify number → webhook mapping

---

## Milestone 2 — Realtime voice bridge
**Scope**
- Twilio Media Streams ↔ OpenAI Realtime WS
- μ-law ↔ PCM16 8k/16k; VAD via server turns
- Streamed audio back to caller

**Acceptance**
- Caller presses 9 → natural assistant, bidirectional audio

**Risks**
- Audio glitches / drift / latency spikes

**Mitigation**
- Backpressure flush (`input_audio_buffer.commit`) and batching; monitor CPU

---

## Milestone 3 — Tooling & Admin
**Scope**
- Tools: `getBusinessHours`, `takeMessage`, `transferToHuman`, `transferToDepartment`, `bookAppointment`
- Admin UI: Hours, Departments, Call Logs, Analytics
- Intent logging

**Acceptance**
- Tools callable from realtime; departments editable in Admin; intents visible

**Risks**
- Tool schema mismatch with model

**Mitigation**
- Keep tool schemas small; validate inputs, handle errors

---

## Milestone 4 — KB + Citations
**Scope**
- KB models, indexer (embeddings), retrieval tool (`answerQuestion`)
- Spoken citations; CitationsLog + Admin page

**Acceptance**
- Ask FAQ; assistant answers concisely + “Source: …” and logs sources with confidence

**Risks**
- Low-quality grounding

**Mitigation**
- Curate docs; chunk size tuning; confidence threshold policy

---

## Milestone 5 — Bookings
**Scope**
- Google (service account) + Microsoft (Graph client creds)
- Fallback SMS link

**Acceptance**
- “Book me Tuesday 2pm for 30 minutes” → event created (GCal or M365) or SMS link sent

**Risks**
- Calendar permissions / time zones

**Mitigation**
- Test with sandbox calendars; store event links

---

## Milestone 6 — Voicemail STT & Jobs
**Scope**
- BullMQ queues; workers for KB indexing & transcription
- Whisper STT; Jobs dashboard

**Acceptance**
- Voicemail creates transcription Message; Jobs page shows queue counts & failures

**Risks**
- Large recordings / network errors

**Mitigation**
- Retries with exponential backoff; size/time limits

---

## Milestone 7 — Policy & Multilingual
**Scope**
- `getPolicy()` tool (KB confidence + fallback)
- `setLanguage()` tool and voice switch; language logs
- Routing by department name

**Acceptance**
- Below-threshold answers follow fallback; Spanish callers switch voice & KB locale

**Risks**
- Incorrect language detection by model

**Mitigation**
- Allow manual override via DTMF (future), or agent transfer

---

## Data Model (Prisma)
- `CallLog(id, callSid, fromNumber, toNumber, startedAt, endedAt, outcome)`
- `Transcript(callLogId, text)`
- `Message(callLogId, subject, body, notified)`
- `BusinessConfig(address, hoursJson, kbMinConfidence, lowConfidenceAction)`
- `Department(name, phone)`
- `IntentLog(callLogId, intent, meta)`
- `KnowledgeDoc(title, slug, language, content)`
- `KnowledgeChunk(docId, index, text, embedding)`
- `LanguageLog(callSid, language)`
- `CitationsLog(callLogId, callSid, question, language, sources)`

---

## Monitoring & Ops
- Structured logs (pino) for server & worker
- Admin → Jobs for queue health
- DB backups (pg_dump), Redis persistence optional
- Consider Sentry/Datadog for prod

---

## Rollback Plan
- Keep last stable image
- Database migrations are additive; use `prisma migrate reset` only in dev
