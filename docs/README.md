# SalonSales - Salon Voice Assistant

**Type:** Voice Assistant (Service Sales)
**Port:** 8083
**URL Prefix:** `/SalonSales/`

---

## Quick Start

```bash
# Start the application
docker compose up -d

# Access URLs
# Chat: http://localhost:8083/SalonSales/
# Admin: http://localhost:8083/SalonSales/admin?token=admin
```

---

## Features Overview

### Salon Management
- **Appointments** - Booking management
- **Stylists** - Staff management
- **Services** - Service menu and pricing
- **Call Logs** - Call history and transcripts

### Voice Features
- AI voice receptionist
- SMS notifications
- Call transfer
- DTMF menu navigation

### AI Configuration
- AI Scripts
- Knowledge Base
- Voices & Languages
- Greeting customization

---

## Database Schema

### Key Models
- `Appointment` - Booking records
- `Stylist` - Staff members
- `Service` - Service offerings
- `CallLog` - Call history
- `Transcript` - Conversation transcripts
- `SMSSettings` - SMS configuration
- `CallTransfer` - Transfer rules
- `DTMFMenu` - Phone menu options

### Service Model Fields
- name, description
- duration, price
- category

### Stylist Model Fields
- name, specialties
- schedule, availability

---

## Color Theme

| Element | Color | Hex |
|---------|-------|-----|
| Primary | Pink | `#db2777` |
| Secondary | Dark Pink | `#be185d` |
| Accent | Light Pink | `#ec4899` |

---

## Related Documentation

- [CLAUDE.md](../../../CLAUDE.md) - Master reference
- [THEMING.md](../../../THEMING.md) - Theming guide
- [DATABASE-SCHEMAS.md](../../../DATABASE-SCHEMAS.md) - Full schemas
- [SAMPLE-DATA.md](../../../SAMPLE-DATA.md) - Sample data
