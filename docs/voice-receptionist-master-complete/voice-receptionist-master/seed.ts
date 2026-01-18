import 'dotenv/config';
import { prisma } from './src/db/prisma.js';
import { enqueueKbIndex } from './src/queues/enqueue.js';

async function main() {
  // idempotent BusinessConfig
  const cfg = await prisma.businessConfig.findFirst();
  if (!cfg) {
    await prisma.businessConfig.create({
      data: {
        address: '123 Main St, Springfield',
        hoursJson: JSON.stringify({ "Mon-Fri": "9am-6pm", "Sat": "Closed", "Sun": "Closed" }),
        kbMinConfidence: 0.55,
        lowConfidenceAction: 'ask_clarify'
      }
    });
  }

  // Departments
  const departments = [
    { name: 'Sales', phone: process.env.TWILIO_AGENT_TRANSFER_NUMBER || '+15555550111' },
    { name: 'Support', phone: process.env.TWILIO_AGENT_TRANSFER_NUMBER || '+15555550111' }
  ];
  for (const d of departments) {
    await prisma.department.upsert({ where: { name: d.name }, update: { phone: d.phone }, create: d });
  }

  // KB docs (English + Spanish)
  const docs = [
    { title: 'Hours & Location', language: 'en', content: '# Hours & Location\n\nWe are open Monday–Friday 9am–6pm.\nAddress: 123 Main St, Springfield.\nParking available behind the building.\n' },
    { title: 'Appointments', language: 'en', content: '# Appointments\n\nYou can book via phone or the website. Typical slots are 30 minutes. Rescheduling requires 24 hours notice.\n' },
    { title: 'Horario y Dirección', language: 'es', content: '# Horario y Dirección\n\nAbrimos lunes a viernes de 9 a 18 horas.\nDirección: 123 Main St, Springfield.\nEstacionamiento detrás del edificio.\n' }
  ];
  for (const d of docs) {
    const slug = d.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const doc = await prisma.knowledgeDoc.upsert({ where: { slug }, update: { content: d.content, language: d.language, title: d.title }, create: { slug, ...d } });
    await enqueueKbIndex({ docId: doc.id });
  }

  console.log('Seed complete. KB indexing jobs enqueued.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
