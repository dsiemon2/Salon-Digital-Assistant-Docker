# Implementation Plan (Master)

- Twilio Webhook + Realtime Media Streams (Press 9) with μ-law/PCM16 conversion
- Tools: hours, directions/KB, booking (Google/Microsoft), transfer (human/department), voicemail
- Admin UI: Hours (+confidence policy), Depts, Calls, Analytics, KB, Citations, Jobs
- Persistence: Prisma/Postgres (CallLog, Message, Transcript, BusinessConfig, Department, IntentLog, Knowledge*, LanguageLog, CitationsLog)
- Background jobs (BullMQ): KB indexing, transcription
- Observability: structured logs; Jobs dashboard; Citations with source confidence
- Security: token gate for admin; PII minimization; recording disclosure

**Definition of Done**
1) Call the number → natural conversation + live tools
2) Bookings work (Google and/or M365)
3) Transfers work (human & department)
4) Voicemail is transcribed; KB answers have citations
5) Admin dashboards populated; thresholds enforced
