import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating database for XYZ Salon...');

  // Update BusinessConfig
  const config = await prisma.businessConfig.findFirst();
  if (config) {
    await prisma.businessConfig.update({
      where: { id: config.id },
      data: {
        salonName: 'XYZ Salon',
        hoursJson: JSON.stringify({
          'Tuesday': '9:00 AM - 7:00 PM',
          'Wednesday': '9:00 AM - 7:00 PM',
          'Thursday': '9:00 AM - 7:00 PM',
          'Friday': '9:00 AM - 7:00 PM',
          'Saturday': '9:00 AM - 5:00 PM'
        }),
        closedDays: '["Sunday", "Monday"]',
        address: '123 Main Street, Your City, State 12345',
        greeting: 'Thank you for calling XYZ Salon! This is your virtual receptionist. How may I help you today?',
        greetingBusy: 'Thanks for calling XYZ Salon! Our stylists are currently with guests, but I can help you right away. What do you need today?',
        closingMessage: 'Thank you for calling XYZ Salon! We look forward to seeing you. Have a beautiful day!'
      }
    });
    console.log('Updated business config');
  }

  // Clear knowledge docs with old content
  await prisma.knowledgeChunk.deleteMany();
  await prisma.knowledgeDoc.deleteMany();
  console.log('Cleared knowledge base');

  // Clear old transcripts and call logs
  await prisma.transcript.deleteMany();
  await prisma.callLog.deleteMany();
  console.log('Cleared call logs');

  console.log('\nDatabase updated for XYZ Salon!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
