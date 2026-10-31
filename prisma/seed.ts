import { PrismaClient, Role, EventStatus, RundownStatus, LogisticsStage, ItemCondition } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data in reverse order of foreign key dependencies
  await prisma.passwordResetToken.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.logisticsChecklist.deleteMany();
  await prisma.crewAttendance.deleteMany();
  await prisma.eventCrew.deleteMany();
  await prisma.rundownItem.deleteMany();
  await prisma.userDeviceToken.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Create Platform Admin Organization (SaaS Internal)
  const platformOrg = await prisma.organization.create({
    data: {
      name: 'CrewSync Platform Headquarters',
      subscriptionTier: 'enterprise',
    },
  });

  // 2. Hash default password
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // 3. Create SUPERADMIN (Platform Owner - YOU)
  const superadmin = await prisma.user.create({
    data: {
      organizationId: platformOrg.id,
      fullName: 'Super Admin (CrewSync Platform Owner)',
      phoneNumber: '081111111111',
      email: 'admin@crewsync.id',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      passwordHash: defaultPasswordHash,
      role: Role.SUPERADMIN,
    },
  });
  console.log(`✅ Created Superadmin: ${superadmin.fullName} (${superadmin.phoneNumber})`);

  // 4. Create Client Organization (Tenant EO)
  const organization = await prisma.organization.create({
    data: {
      name: 'Artha Wedding & Event Planner',
      subscriptionTier: 'pro',
    },
  });
  console.log(`✅ Created organization: ${organization.name} (${organization.id})`);

  // 5. Create Tenant Users (Owner, Planner, Coordinator, Crew)

  // A. 👑 OWNER (Client EO Owner)
  const owner = await prisma.user.create({
    data: {
      organizationId: organization.id,
      fullName: 'Hendra Wijaya (Owner & Director)',
      phoneNumber: '081234567899',
      email: 'owner@arthaworganizer.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      passwordHash: defaultPasswordHash,
      role: Role.OWNER,
    },
  });
  console.log(`✅ Created Client Owner: ${owner.fullName} (${owner.phoneNumber})`);

  // B. 📋 PLANNER
  const planner = await prisma.user.create({
    data: {
      organizationId: organization.id,
      fullName: 'Budi Pratama (Lead Planner)',
      phoneNumber: '081234567890',
      email: 'planner@arthaworganizer.com',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      passwordHash: defaultPasswordHash,
      role: Role.PLANNER,
    },
  });

  // C. 🎯 COORDINATOR
  const coordinator = await prisma.user.create({
    data: {
      organizationId: organization.id,
      fullName: 'Dewi Lestari (Field & Catering Coordinator)',
      phoneNumber: '081234567893',
      email: 'coordinator@arthaworganizer.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      passwordHash: defaultPasswordHash,
      role: Role.COORDINATOR,
    },
  });

  // D. 👷 CREW
  const crew = await prisma.user.create({
    data: {
      organizationId: organization.id,
      fullName: 'Siti Rahma (Stage Crew & Runner)',
      phoneNumber: '081234567891',
      email: 'crew@arthaworganizer.com',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      passwordHash: defaultPasswordHash,
      role: Role.CREW,
    },
  });

  // Additional support crew
  const crewTech = await prisma.user.create({
    data: {
      organizationId: organization.id,
      fullName: 'Ahmad Rizky (Sound & Lighting Tech)',
      phoneNumber: '081234567892',
      email: 'ahmad.tech@arthaworganizer.com',
      passwordHash: defaultPasswordHash,
      role: Role.CREW,
    },
  });

  console.log(`✅ Created 4 role-specific users + 1 technical crew`);

  // 4. Create 1 Active Event with venue coordinates & geofence
  const now = new Date();
  const eventDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

  const event = await prisma.event.create({
    data: {
      organizationId: organization.id,
      title: 'Resepsi Pernikahan Galih & Ratna',
      category: 'Wedding',
      eventDate: eventDate,
      venueName: 'Balai Kartini Exhibition Hall, Jakarta',
      venueLat: -6.23612,
      venueLng: 106.82841,
      geofenceRadiusMeters: 150,
      status: EventStatus.ONGOING,
    },
  });
  console.log(`✅ Created active event: ${event.title} at ${event.venueName}`);

  // 5. Assign crews to event
  await prisma.eventCrew.create({
    data: {
      eventId: event.id,
      userId: coordinator.id,
      assignedRole: 'Field Coordinator',
      shiftStart: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0),
      shiftEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0),
      feeAmount: 450000.0,
    },
  });

  await prisma.eventCrew.create({
    data: {
      eventId: event.id,
      userId: crew.id,
      assignedRole: 'Stage Coordinator & Runner',
      shiftStart: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0),
      shiftEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0),
      feeAmount: 350000.0,
    },
  });

  await prisma.eventCrew.create({
    data: {
      eventId: event.id,
      userId: crewTech.id,
      assignedRole: 'Sound & Lighting Tech',
      shiftStart: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30, 0),
      shiftEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 30, 0),
      feeAmount: 400000.0,
    },
  });
  console.log(`✅ Assigned crews to event`);

  // 6. Add sample Rundown Items
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
        picUserId: coordinator.id,
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
        picUserId: crew.id,
        status: RundownStatus.PENDING,
      },
    ],
  });
  console.log(`✅ Created initial rundown items`);

  // 7. Add sample Logistics Checklist
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
            verifiedByUserId: crewTech.id,
            verifiedAt: new Date(),
          },
          {
            itemName: 'Walkie Talkie Baofeng UV-5R',
            quantityExpected: 10,
            quantityActual: 10,
            condition: ItemCondition.GOOD,
            verifiedByUserId: coordinator.id,
            verifiedAt: new Date(),
          },
          {
            itemName: 'Kabel XLR Audio 20m',
            quantityExpected: 8,
            quantityActual: 7,
            condition: ItemCondition.MISSING,
            verifiedByUserId: crewTech.id,
            notes: '1 kabel tertinggal di gudang kantor, sedang diambil tim cadangan.',
            verifiedAt: new Date(),
          },
        ],
      },
    },
  });
  console.log(`✅ Created logistics checklist: ${checklist.name}`);

  console.log('\n=============================================================');
  console.log('              🎉 SEEDING COMPLETED SUCCESSFULLY!             ');
  console.log('=============================================================');
  console.log('Password untuk SEMUA akun: password123\n');
  console.log('👑 [SAAS PLATFORM OWNER]');
  console.log('• 🛡️ SUPERADMIN : 081111111111 | admin@crewsync.id');
  console.log('  Organisasi   : CrewSync Platform Headquarters\n');
  console.log('🏢 [CLIENT TENANT EO - Artha Wedding]');
  console.log('• 👑 OWNER       : 081234567899 | owner@arthaworganizer.com');
  console.log('• 📋 PLANNER     : 081234567890 | planner@arthaworganizer.com');
  console.log('• 🎯 COORDINATOR : 081234567893 | coordinator@arthaworganizer.com');
  console.log('• 👷 CREW        : 081234567891 | crew@arthaworganizer.com');
  console.log('=============================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
