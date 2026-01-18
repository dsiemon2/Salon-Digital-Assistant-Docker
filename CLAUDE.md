# Salon Digital Assistant - Claude Code Conventions

**READ THIS ENTIRE FILE before making ANY changes to this project.**

---

## Project Overview

| Property | Value |
|----------|-------|
| **Type** | Voice Assistant |
| **Purpose** | AI voice receptionist for salon (appointments, services, pricing) |
| **Port** | TBD |
| **URL Prefix** | `/SalonAI/` |
| **Theme** | Professional salon branding |

## Tech Stack

- **Backend:** Node.js + Express + TypeScript
- **Database:** Prisma + SQLite
- **Frontend:** EJS templates + Bootstrap 5 + Bootstrap Icons
- **Voice:** OpenAI Realtime API (WebSockets)
- **Container:** Docker + Docker Compose

## Key Features

- Appointment scheduling via voice
- Service and pricing information
- Stylist availability checking
- Appointment reminders
- Call transfer to front desk when needed

## File Structure

```
Salon-Digital-Assistant-Docker/
├── docker/
│   └── nginx.conf
├── docs/
├── kb/                    # Knowledge base files
├── src/
│   ├── routes/
│   └── server.ts
├── views/
│   └── admin/
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── Dockerfile
└── CLAUDE.md
```

## UI Standards

### Action Buttons - Must Have Tooltips
```html
<button class="btn btn-sm btn-outline-primary"
        data-bs-toggle="tooltip"
        title="Describe what this button does">
  <i class="bi bi-icon-name"></i>
</button>
```

### Data Tables - Must Have
1. Row Selection (checkbox column, select all, bulk actions)
2. Pagination (page size selector, navigation, showing X-Y of Z)

---

## Agent Capabilities

When working on this project, apply these specialized behaviors:

### Backend Architect
- Design Express routes for appointments, services, stylists
- Implement Prisma ORM with SQLite for scheduling
- Structure API endpoints for calendar integration
- Handle booking conflicts and availability logic

### AI Engineer
- Design professional, welcoming salon voice persona
- Handle appointment booking dialogue naturally
- Process service inquiries ("How long does a balayage take?")
- Implement stylist preference handling
- Graceful handoff to receptionist when needed

### Database Admin
- Schema for Services, Stylists, Appointments, Clients
- Availability and scheduling logic
- Service categories and pricing tiers
- Client history and preferences

### Security Auditor
- Protect client personal information
- Secure appointment data
- Validate booking inputs
- Review stylist access permissions

### Content Creator
- Write service descriptions for voice readback
- Create appointment confirmation scripts
- Design pricing explanations
- Craft professional greeting and farewell messages

### UX Researcher
- Design smooth booking flow via voice
- Handle common scheduling scenarios
- Implement accessibility for phone interactions
- Test with diverse caller types

### Performance Optimizer
- Real-time availability checking
- Efficient calendar queries
- Handle concurrent booking attempts
- Cache service and pricing information
