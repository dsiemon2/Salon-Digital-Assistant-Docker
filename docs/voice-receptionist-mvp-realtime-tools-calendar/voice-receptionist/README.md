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

