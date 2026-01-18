# Agent Implementation - Salon Digital Assistant

## Project Overview

**Type**: Voice Receptionist (Twilio + OpenAI Realtime)
**Purpose**: Salon voice assistant for appointment booking, call routing, and FAQ

## Tech Stack

```
Backend:     Node.js + Express + TypeScript
Database:    PostgreSQL + Prisma ORM
Queue:       BullMQ (background jobs)
Cache:       Redis
Telephony:   Twilio Programmable Voice
Voice AI:    OpenAI Realtime API
Calendar:    Google Calendar, Microsoft Graph
Frontend:    EJS templates + Bootstrap 5
Container:   Docker + Docker Compose
```

## Key Components

- `src/realtime/toolRegistry.ts` - Voice assistant tools (booking, lookup)
- `src/realtime/mediaServer.ts` - Media streaming bridge
- `src/services/calendar/` - Calendar integration services
- `src/routes/` - Admin API routes
- `prisma/schema.prisma` - Database schema

---

## Recommended Agents

### MUST IMPLEMENT (Priority 1)

| Agent | File | Use Case |
|-------|------|----------|
| **Backend Architect** | engineering/backend-architect.md | Calendar integration, booking logic, WebSocket architecture |
| **DevOps Automator** | engineering/devops-automator.md | Docker, Redis, BullMQ, PostgreSQL management |
| **AI Engineer** | engineering/ai-engineer.md | OpenAI Realtime API, appointment booking tools |
| **Database Admin** | data/database-admin.md | PostgreSQL, appointment schema, analytics tables |
| **Security Auditor** | security/security-auditor.md | OAuth tokens (Google/MS), webhook security, PII protection |
| **Bug Debugger** | quality/bug-debugger.md | Calendar sync issues, booking conflicts, voice problems |

### SHOULD IMPLEMENT (Priority 2)

| Agent | File | Use Case |
|-------|------|----------|
| **API Tester** | testing/api-tester.md | Calendar API testing, Twilio webhooks |
| **Performance Benchmarker** | testing/performance-benchmarker.md | Booking latency, calendar sync speed |
| **Infrastructure Maintainer** | studio-operations/infrastructure-maintainer.md | Redis sessions, BullMQ jobs, OAuth token refresh |
| **Code Reviewer** | quality/code-reviewer.md | TypeScript patterns, async calendar operations |
| **UI Designer** | design/ui-designer.md | Admin booking interface |

### COULD IMPLEMENT (Priority 3)

| Agent | File | Use Case |
|-------|------|----------|
| **Workflow Optimizer** | testing/workflow-optimizer.md | Booking flow optimization |
| **Analytics Reporter** | studio-operations/analytics-reporter.md | Appointment analytics, call metrics |
| **Content Creator** | marketing/content-creator.md | Service descriptions, FAQ content |
| **Support Responder** | studio-operations/support-responder.md | Customer service templates |

---

## Agent Prompts Tailored for This Project

### Backend Architect Prompt Addition
```
Project Context:
- Voice receptionist for salon appointment booking
- Calendar integration: Google Calendar and Microsoft Graph APIs
- Booking conflict detection and slot availability
- Multi-language support (24 languages)
- Key files: src/services/calendar/, src/realtime/toolRegistry.ts
```

### AI Engineer Prompt Addition
```
Project Context:
- OpenAI Realtime API for voice interaction
- Tools: book_appointment, check_availability, get_services, transfer_call
- Calendar OAuth flow for Google/Microsoft
- Appointment reminders via background jobs
```

### Security Auditor Prompt Addition
```
Project Context:
- OAuth 2.0 token storage and refresh (Google, Microsoft)
- Customer PII in appointments (name, phone, email)
- Twilio webhook signature validation
- Session security with Redis
```

---

## Marketing & Growth Agents (When Production Ready)

Add these when the project is ready for public release/marketing:

### Social Media & Marketing

| Agent | File | Use Case |
|-------|------|----------|
| **TikTok Strategist** | marketing/tiktok-strategist.md | Salon transformation videos, styling tips |
| **Instagram Curator** | marketing/instagram-curator.md | Before/after photos, salon aesthetics, Reels |
| **Twitter/X Engager** | marketing/twitter-engager.md | Local salon community, appointment reminders |
| **Reddit Community Builder** | marketing/reddit-community-builder.md | r/HairCare, local beauty communities |
| **Content Creator** | marketing/content-creator.md | Service descriptions, styling tips, FAQ |
| **SEO Optimizer** | marketing/seo-optimizer.md | Local SEO, "salon near me", service keywords |
| **Visual Storyteller** | design/visual-storyteller.md | Salon ambiance, styling results, team photos |

### Growth & Analytics

| Agent | File | Use Case |
|-------|------|----------|
| **Growth Hacker** | marketing/growth-hacker.md | New client acquisition, referral programs |
| **Trend Researcher** | product/trend-researcher.md | Hair trends, beauty industry updates |
| **Finance Tracker** | studio-operations/finance-tracker.md | Appointment revenue, service profitability |
| **Analytics Reporter** | studio-operations/analytics-reporter.md | Booking metrics, client retention |

---

## Not Recommended for This Project

| Agent | Reason |
|-------|--------|
| Mobile App Builder | No mobile app |
| Whimsy Injector | Professional salon context |

---

## Implementation Commands

```bash
# Invoke agents from project root
claude --agent engineering/backend-architect
claude --agent engineering/devops-automator
claude --agent engineering/ai-engineer
claude --agent data/database-admin
claude --agent security/security-auditor
claude --agent quality/bug-debugger
```
