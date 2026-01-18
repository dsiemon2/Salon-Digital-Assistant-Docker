# Salon Digital Assistant

AI voice receptionist for salon appointments, services, and pricing.

## Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express 4.19
- **Language:** TypeScript 5.6
- **Database:** SQLite
- **ORM:** Prisma 5.19
- **WebSockets:** ws 8.18.0
- **AI:** OpenAI Realtime API

### Frontend
- **Templating:** EJS 3.1
- **CSS Framework:** Bootstrap 5
- **Icons:** Bootstrap Icons

## Features

- **Appointment Scheduling**: Book appointments via natural voice conversation
- **Service Information**: Inquire about services, pricing, and duration
- **Stylist Availability**: Check stylist availability and preferences
- **Appointment Reminders**: Automated reminder system
- **Call Transfer**: Connect to front desk when needed

## Ports

| Service | Port | Description |
|---------|------|-------------|
| Nginx Proxy | 8083 | Main entry point |
| App Server | 3000 | Internal - Main application |
| Admin Server | 3001 | Internal - Admin panel |

## Local Development URLs

- **Landing Page:** http://localhost:8083/SalonAI/
- **Admin Panel:** http://localhost:8083/SalonAI/admin?token=admin

## Docker Setup

```bash
# Start all services
docker compose up -d

# Rebuild and start
docker compose up -d --build

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

## Author

Daniel Siemon
