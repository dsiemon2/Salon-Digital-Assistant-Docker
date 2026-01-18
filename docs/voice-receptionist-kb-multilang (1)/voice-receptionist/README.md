# Digital Voice Receptionist (MVP)

A production-lean MVP you can connect to a real phone number to answer calls, greet callers, route them, take messages, book appointments, and hand off to a human when needed.

## Why this stack?
- **Telephony:** Twilio Programmable Voice (webhooks + optional Media Streams).
- **Realtime Voice AI:** OpenAI Realtime API for low-latency STT → LLM → TTS.
- **Language:** **TypeScript/Node.js**.
- **Store:** Postgres (call logs & transcripts), Redis (ephemeral session).
- **Infra:** Dockerized; run locally with `ngrok`, deploy anywhere.

Follow the Quickstart in this README and see `implementation-plan.md` and `roadmap.md`.

## Realtime Preview (Media Streams)
- Set your number to connect to a Media Stream (bidirectional support varies by account/region).
- This MVP includes a `/media` WebSocket that accepts Twilio Media Stream JSON frames and relays them to an OpenAI Realtime WS.
- Audio transcoding (PCMU<->PCM16 16k) is scaffolded as TODOs. The system will fall back to the DTMF menu until transcoding is enabled.


### Direct Google Calendar booking (optional)
- Create a Google **Service Account** and grant it access to the target calendar.
- Copy its JSON, then base64-encode it and set `GOOGLE_CALENDAR_SA_B64`.
- Set `GOOGLE_CALENDAR_ID` to the calendar's ID (or `primary` within a Workspace account the SA can access).


### Microsoft 365 booking (optional)
- Create an Azure AD App (client credentials) with **Calendars.ReadWrite** app permission.
- Fill `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and `M365_CALENDAR_USER` (UPN).
- The assistant will book directly to that user's calendar when asked.

### Live-Agent transfer mid-conversation
- Set `TWILIO_AGENT_TRANSFER_NUMBER`.
- In realtime calls (option 9), when the model decides to use the `transferToHuman` tool, the server updates the live call with `<Dial>` TwiML and bridges the agent.

### Admin UI
- Set `ADMIN_TOKEN` in `.env`.
- Visit: `https://<host>/admin?token=YOUR_TOKEN`
- Edit **Address & Hours**, manage **Departments**, and view **Call Logs**.

### Department routing & Analytics
- Add departments in the Admin UI. The assistant can now *transfer by department name* (e.g., "transfer me to Sales").
- Analytics page (`/admin/analytics?token=...`) shows last-30-days **top intents**, **transfer count**, and **average handle time**.
- For best metrics, configure Twilio **Status Callback** to `POST https://<host>/voice/status`.

### Knowledge Base (FAQ) & Retrieval
- Put markdown files in `/kb` (use suffix `.en.md`, `.es.md`, etc.).
- Index them (embeddings) with: `npm run kb:index` (requires `OPENAI_API_KEY` and default `text-embedding-3-small`).
- The assistant can call the `answerQuestion` tool to ground answers in your KB, returning citations.

### Multilingual
- The assistant auto-detects language; it can also call `setLanguage(lang)` to switch TTS voice mid-call.
- Add multilingual KB files (e.g., `hours-and-location.es.md`) to improve retrieval for that language.
