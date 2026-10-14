import { PrismaClient, Role, EventStatus, RundownStatus, LogisticsStage, ItemCondition } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data in reverse order of dependencies
  await prisma.checklistItem.deleteMany();
  await prisma.logisticsChecklist.deleteMany();
  await prisma.crewAttendance.deleteMany();
  await prisma.eventCrew.deleteMany();
  await prisma.rundownItem.deleteMany();
  await prisma.userDeviceToken.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Create Organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Artha Wedding & Event Planner',
      subscriptionTier: 'pro',
    },
  });
  console.log(`✅ Created organization: ${organization.name} (${organization.id})`);

  // 2. Hash default password
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // 3. Create Planner User
  const planner = await prisma.user.create({
    data: {
      organizationId: organization.id,
      fullName: 'Budi Pratama (Lead Planner)',
      phoneNumber: '081234567890',
      email: 'planner@arthaworganizer.com',
      passwordHash: defaultPasswordHash,
      role: Role.PLANNER,
    },
  });
  console.log(`✅ Created planner: ${planner.fullName} (${planner.phoneNumber})`);

  // 4. Create 3 Crew Users
  const crew1 = await prisma.user.create({
    data: {
      organizationId: organization.id,
      fullName: 'Siti Rahma (Stage Crew)',
      phoneNumber: '081234567891',
      email: 'siti.crew@arthaworganizer.com',
      passwordHash: defaultPasswordHash,
      role: Role.CREW,
    },
  });

  const crew2 = await prisma.user.create({
    data: {
      organizationId: organization.id,
      fullName: 'Ahmad Rizky (Audio-Visual Crew)',
      phoneNumber: '081234567892',
      email: 'ahmad.crew@arthaworganizer.com',
      passwordHash: defaultPasswordHash,
      role: Role.CREW,
    },
  });

  const crew3 = await prisma.user.create({
    data: {
      organizationId: organization.id,
      fullName: 'Dewi Lestari (Catering Coordinator)',
      phoneNumber: '081234567893',
      email: 'dewi.crew@arthaworganizer.com',
      passwordHash: defaultPasswordHash,
      role: Role.CREW,
    },
  });
  console.log(`✅ Created 3 crew accounts: Siti, Ahmad, Dewi`);

  // 5. Create 1 Active Event with venue coordinates & geofence
  const now = new Date();
  const eventDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

  const event = await prisma.event.create({
    data: {
      organizationId: organization.id,
      title: 'Resepsi Pernikahan Galih & Ratna',
      category: 'Wedding',
      eventDate: eventDate,
      venueName: 'Balai Kartini Exhibition Hall, Jakarta',
      venueLat: -6.2361200,
      venueLng: 106.8284100,
      geofenceRadiusMeters: 150,
      status: EventStatus.ONGOING,
    },
  });
  console.log(`✅ Created active event: ${event.title} at ${event.venueName}`);

  // 6. Assign crews to event
  await prisma.eventCrew.create({
    data: {
      eventId: event.id,
      userId: crew1.id,
      assignedRole: 'Stage Coordinator',
      shiftStart: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0),
      shiftEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0),
      feeAmount: 350000.0,
    },
  });

  await prisma.eventCrew.create({
    data: {
      eventId: event.id,
      userId: crew2.id,
      assignedRole: 'Sound & Lighting Tech',
      shiftStart: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30, 0),
      shiftEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 30, 0),
      feeAmount: 400000.0,
    },
  });

  await prisma.eventCrew.create({
    data: {
      eventId: event.id,
      userId: crew3.id,
      assignedRole: 'Buffet & Catering In-Charge',
      shiftStart: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0),
      shiftEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0, 0),
      feeAmount: 300000.0,
    },
  });
  console.log(`✅ Assigned 3 crews to event`);

  // 7. Add sample Rundown Items
  await prisma.rundownItem.createMany({
    data: [
      {
        eventId: event.id,
        orderIndex: 1,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
        title: 'Briefing Tim & Final Soundcheck',
        description: 'Seluruh kru stand by dan koordinasi radio walkie-talkie.',
        locationSection: 'Main Ballroom',
        picUserId: planner.id,
        status: RundownStatus.COMPLETED,
        actualStartedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 2, 0),
        actualEndedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 55, 0),
      },
      {
        eventId: event.id,
        orderIndex: 2,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0),
        title: 'Akad Nikah / Ijab Qabul',
        description: 'Prosesi akad nikah di pelaminan utama bersama penghulu.',
        locationSection: 'Pelaminan',
        picUserId: crew1.id,
        status: RundownStatus.ACTIVE,
        actualStartedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 5, 0),
      },
      {
        eventId: event.id,
        orderIndex: 3,
        startTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
        endTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0),
        title: 'Resepsi & Jamuan Tamu',
        description: 'Pembukaan buffet katering dan penampilan live music.',
        locationSection: 'Ballroom & Dining Area',
        picUserId: crew3.id,
        status: RundownStatus.PENDING,
      },
    ],
  });
  console.log(`✅ Created initial rundown items`);

  // 8. Add sample Logistics Checklist
  const checklist = await prisma.logisticsChecklist.create({
    data: {
      eventId: event.id,
      name: 'Peralatan Audio Visual & Sound System (Load-In)',
      stage: LogisticsStage.LOAD_IN,
      items: {
        create: [
          {
            itemName: 'Wireless Microphone Sennheiser G4 (Set isi 4)',
            quantityExpected: 4,
            quantityActual: 4,
            condition: ItemCondition.GOOD,
            verifiedByUserId: crew2.id,
            verifiedAt: new Date(),
          },
          {
            itemName: 'Walkie Talkie Baofeng UV-5R',
            quantityExpected: 10,
            quantityActual: 10,
            condition: ItemCondition.GOOD,
            verifiedByUserId: crew1.id,
            verifiedAt: new Date(),
          },
          {
            itemName: 'Kabel XLR Audio 20m',
            quantityExpected: 8,
            quantityActual: 7,
            condition: ItemCondition.MISSING,
            verifiedByUserId: crew2.id,
            notes: '1 kabel tertinggal di gudang kantor, sedang diambil tim cadangan.',
            verifiedAt: new Date(),
          },
        ],
      },
    },
  });
  console.log(`✅ Created logistics checklist: ${checklist.name}`);

  console.log('✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
