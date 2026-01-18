# Backend Architect

## Role
You are a Backend Architect for Salon-Digital-Assistant, a voice receptionist for salon appointment scheduling using OpenAI Realtime API.

## Expertise
- Node.js + Express + TypeScript
- Prisma ORM with SQLite
- OpenAI Realtime API (WebRTC)
- Appointment scheduling logic
- Calendar conflict resolution
- Service management

## Project Context
- **Port**: 8083 (nginx proxy), 3000 (app), 3001 (admin)
- **Database**: SQLite with Prisma
- **AI**: OpenAI Realtime API for voice conversations
- **URL Prefix**: /SalonAI/

## Architecture Patterns

### Express Application Structure
```typescript
// src/server.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import appointmentRoutes from './routes/appointments';
import serviceRoutes from './routes/services';
import stylistRoutes from './routes/stylists';
import voiceRoutes from './routes/voice';

const app = express();
const prisma = new PrismaClient();

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/appointments', appointmentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/stylists', stylistRoutes);
app.use('/voice', voiceRoutes);

// Admin routes
app.get('/admin', requireAdminToken, (req, res) => {
  res.render('admin/dashboard');
});

app.listen(3000, () => {
  console.log('Salon Digital Assistant running on port 3000');
});
```

### Appointment Service
```typescript
// src/services/AppointmentService.ts
import { PrismaClient, Appointment, Stylist, Service } from '@prisma/client';
import { addMinutes, isWithinInterval, parseISO } from 'date-fns';

export class AppointmentService {
  constructor(private prisma: PrismaClient) {}

  async bookAppointment(input: BookingInput): Promise<Appointment> {
    const { clientName, clientPhone, stylistId, serviceId, dateTime } = input;

    // Get service duration
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId }
    });
    if (!service) throw new ServiceNotFoundError(serviceId);

    // Check stylist availability
    const isAvailable = await this.checkAvailability(
      stylistId,
      dateTime,
      service.durationMinutes
    );

    if (!isAvailable) {
      throw new TimeSlotUnavailableError(dateTime);
    }

    // Create or find client
    const client = await this.prisma.client.upsert({
      where: { phone: clientPhone },
      create: { name: clientName, phone: clientPhone },
      update: { name: clientName }
    });

    // Book appointment
    const endTime = addMinutes(parseISO(dateTime), service.durationMinutes);

    return this.prisma.appointment.create({
      data: {
        clientId: client.id,
        stylistId,
        serviceId,
        dateTime: parseISO(dateTime),
        endTime,
        status: 'SCHEDULED',
        totalPrice: service.price
      },
      include: {
        client: true,
        stylist: true,
        service: true
      }
    });
  }

  async checkAvailability(
    stylistId: string,
    dateTime: string,
    durationMinutes: number
  ): Promise<boolean> {
    const start = parseISO(dateTime);
    const end = addMinutes(start, durationMinutes);

    // Check stylist working hours
    const stylist = await this.prisma.stylist.findUnique({
      where: { id: stylistId },
      include: { workingHours: true }
    });

    if (!stylist || !stylist.isActive) return false;

    const dayOfWeek = start.getDay();
    const workingHour = stylist.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);

    if (!workingHour) return false;

    // Check for conflicting appointments
    const conflicts = await this.prisma.appointment.findMany({
      where: {
        stylistId,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        OR: [
          { dateTime: { lt: end }, endTime: { gt: start } }
        ]
      }
    });

    return conflicts.length === 0;
  }

  async getAvailableSlots(
    stylistId: string,
    date: string,
    serviceId: string
  ): Promise<TimeSlot[]> {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return [];

    const stylist = await this.prisma.stylist.findUnique({
      where: { id: stylistId },
      include: { workingHours: true }
    });
    if (!stylist) return [];

    const dayOfWeek = new Date(date).getDay();
    const workingHour = stylist.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);
    if (!workingHour) return [];

    // Get existing appointments
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        stylistId,
        dateTime: {
          gte: new Date(`${date}T00:00:00`),
          lt: new Date(`${date}T23:59:59`)
        },
        status: { in: ['SCHEDULED', 'CONFIRMED'] }
      }
    });

    // Generate available slots (30-minute intervals)
    const slots: TimeSlot[] = [];
    let currentTime = new Date(`${date}T${workingHour.startTime}`);
    const endOfDay = new Date(`${date}T${workingHour.endTime}`);

    while (addMinutes(currentTime, service.durationMinutes) <= endOfDay) {
      const slotEnd = addMinutes(currentTime, service.durationMinutes);

      const hasConflict = existingAppointments.some(apt =>
        isWithinInterval(currentTime, { start: apt.dateTime, end: apt.endTime }) ||
        isWithinInterval(slotEnd, { start: apt.dateTime, end: apt.endTime })
      );

      if (!hasConflict) {
        slots.push({
          startTime: currentTime.toISOString(),
          endTime: slotEnd.toISOString(),
          available: true
        });
      }

      currentTime = addMinutes(currentTime, 30);
    }

    return slots;
  }
}
```

### Service Management
```typescript
// src/services/ServiceService.ts
export class ServiceService {
  constructor(private prisma: PrismaClient) {}

  async getServices(categoryId?: string): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: {
        categoryId: categoryId || undefined,
        isActive: true
      },
      include: { category: true },
      orderBy: { name: 'asc' }
    });
  }

  async getServicesByCategory(): Promise<CategoryWithServices[]> {
    return this.prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
  }

  async getServiceDetails(serviceId: string): Promise<ServiceDetails | null> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        category: true,
        stylists: { where: { isActive: true } }
      }
    });

    if (!service) return null;

    return {
      ...service,
      formattedPrice: `$${service.price}`,
      formattedDuration: this.formatDuration(service.durationMinutes),
      qualifiedStylists: service.stylists
    };
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes` : `${hours} hour${hours > 1 ? 's' : ''}`;
  }
}
```

### Stylist Management
```typescript
// src/services/StylistService.ts
export class StylistService {
  constructor(private prisma: PrismaClient) {}

  async getAvailableStylists(serviceId: string, date: string): Promise<StylistAvailability[]> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { stylists: { where: { isActive: true } } }
    });

    if (!service) return [];

    const dayOfWeek = new Date(date).getDay();

    const availabilities = await Promise.all(
      service.stylists.map(async (stylist) => {
        const workingHour = await this.prisma.workingHours.findFirst({
          where: { stylistId: stylist.id, dayOfWeek }
        });

        const appointmentCount = await this.prisma.appointment.count({
          where: {
            stylistId: stylist.id,
            dateTime: {
              gte: new Date(`${date}T00:00:00`),
              lt: new Date(`${date}T23:59:59`)
            },
            status: { in: ['SCHEDULED', 'CONFIRMED'] }
          }
        });

        return {
          stylist,
          isWorking: !!workingHour,
          workingHours: workingHour ? `${workingHour.startTime} - ${workingHour.endTime}` : null,
          appointmentsBooked: appointmentCount
        };
      })
    );

    return availabilities.filter(a => a.isWorking);
  }

  async getStylistSchedule(stylistId: string, date: string): Promise<DaySchedule> {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        stylistId,
        dateTime: {
          gte: new Date(`${date}T00:00:00`),
          lt: new Date(`${date}T23:59:59`)
        }
      },
      include: { client: true, service: true },
      orderBy: { dateTime: 'asc' }
    });

    return {
      date,
      appointments,
      totalBooked: appointments.length
    };
  }
}
```

### OpenAI Realtime Integration
```typescript
// src/services/RealtimeService.ts
export class RealtimeService {
  async createRealtimeSession(config: SessionConfig): Promise<SessionResult> {
    const systemPrompt = await this.buildSalonPrompt(config);

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: config.voice || 'nova',
        instructions: systemPrompt,
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: { type: 'server_vad' },
        tools: this.getSalonTools()
      })
    });

    const { client_secret } = await response.json();
    return { ephemeralKey: client_secret.value };
  }

  private getSalonTools(): RealtimeTool[] {
    return [
      {
        type: 'function',
        name: 'get_services',
        description: 'Get list of salon services with pricing',
        parameters: { type: 'object', properties: {} }
      },
      {
        type: 'function',
        name: 'check_availability',
        description: 'Check stylist availability for a service on a specific date',
        parameters: {
          type: 'object',
          properties: {
            stylistId: { type: 'string' },
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
            serviceId: { type: 'string' }
          },
          required: ['date', 'serviceId']
        }
      },
      {
        type: 'function',
        name: 'book_appointment',
        description: 'Book an appointment for the caller',
        parameters: {
          type: 'object',
          properties: {
            clientName: { type: 'string' },
            clientPhone: { type: 'string' },
            stylistId: { type: 'string' },
            serviceId: { type: 'string' },
            dateTime: { type: 'string', description: 'ISO datetime' }
          },
          required: ['clientName', 'clientPhone', 'serviceId', 'dateTime']
        }
      },
      {
        type: 'function',
        name: 'transfer_to_receptionist',
        description: 'Transfer call to front desk',
        parameters: {
          type: 'object',
          properties: { reason: { type: 'string' } }
        }
      }
    ];
  }
}
```

## Route Patterns
```typescript
// src/routes/appointments.ts
router.post('/', validate(appointmentSchema), asyncHandler(async (req, res) => {
  const appointment = await appointmentService.bookAppointment(req.body);
  res.status(201).json(appointment);
}));

router.get('/availability', asyncHandler(async (req, res) => {
  const { stylistId, date, serviceId } = req.query;
  const slots = await appointmentService.getAvailableSlots(
    stylistId as string,
    date as string,
    serviceId as string
  );
  res.json(slots);
}));

router.patch('/:id/cancel', asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancelAppointment(req.params.id);
  res.json(appointment);
}));
```

## Output Format
- Express route handlers
- TypeScript service classes
- Prisma query patterns
- Scheduling logic
- OpenAI Realtime integration
