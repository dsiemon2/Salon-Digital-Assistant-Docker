# Digital Voice Receptionist — Master Bundle

Turnkey voice receptionist with natural conversation, live transfer, bookings, voicemail STT, multilingual KB, citations, background jobs, and an Admin UI.

## One-liner (everything, local)
```bash
cp .env.example .env
# Fill the required env vars (Twilio, OpenAI, DB/Redis default to compose)
docker compose --profile db --profile redis --profile app --profile worker up --build
# (Optional) In a second terminal, run ngrok profile for public webhook)
# docker compose --profile ngrok up
```

## First run (local dev)
```bash
npm install
docker compose --profile db --profile redis up -d
npx prisma migrate dev
npm run seed              # seeds config, departments, and KB (auto-index jobs)
npm run dev               # app
npm run worker            # background jobs
```
Expose with `ngrok http 3000` or compose profile `ngrok` (requires `NGROK_AUTHTOKEN`).

## Twilio setup
- Buy/configure a Voice-enabled number
- Voice webhook (POST): `https://<host>/voice`
- Status callback (POST): `https://<host>/voice/status`
- Call and press **9** for the realtime assistant

## Admin UI
`/admin?token=YOUR_TOKEN`
- Hours & Address (+ KB confidence thresholds & fallback policy)
- Departments (for transfers)
- Call Logs, Analytics, KB & Deflection, Citations, Jobs
- Knowledge: add articles → auto-indexed (BullMQ)

## Env quick list
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VOICE_NUMBER`, `TWILIO_AGENT_TRANSFER_NUMBER`
- OpenAI: `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`, `OPENAI_TTS_VOICE`, `OPENAI_STT_MODEL`
- Storage: `DATABASE_URL`, `REDIS_URL`
- Admin: `ADMIN_TOKEN`
- Optional: Google Calendar (`GOOGLE_CALENDAR_SA_B64`, `GOOGLE_CALENDAR_ID`), Microsoft Graph (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `M365_CALENDAR_USER`)
- Optional: `NGROK_AUTHTOKEN`, `NGROK_STATIC_DOMAIN`

See `/docs/deploy.md` for hosting recipes.
