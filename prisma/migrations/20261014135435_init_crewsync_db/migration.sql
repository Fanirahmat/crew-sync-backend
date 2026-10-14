-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'PLANNER', 'COORDINATOR', 'CREW');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RundownStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('BIOMETRIC', 'PHOTO');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('GOOD', 'DAMAGED', 'MISSING');

-- CreateEnum
CREATE TYPE "LogisticsStage" AS ENUM ('LOAD_IN', 'LOAD_OUT', 'POST_EVENT');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CREW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_device_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "venueName" TEXT NOT NULL,
    "venueLat" DECIMAL(10,7) NOT NULL,
    "venueLng" DECIMAL(10,7) NOT NULL,
    "geofenceRadiusMeters" INTEGER NOT NULL DEFAULT 100,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rundown_items" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationSection" TEXT,
    "picUserId" TEXT,
    "status" "RundownStatus" NOT NULL DEFAULT 'PENDING',
    "actualStartedAt" TIMESTAMP(3),
    "actualEndedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rundown_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_crews" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedRole" TEXT NOT NULL,
    "shiftStart" TIMESTAMP(3),
    "shiftEnd" TIMESTAMP(3),
    "feeAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_crews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crew_attendances" (
    "id" TEXT NOT NULL,
    "eventCrewId" TEXT NOT NULL,
    "type" "AttendanceType" NOT NULL,
    "method" "VerificationMethod" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientLat" DECIMAL(10,7) NOT NULL,
    "clientLng" DECIMAL(10,7) NOT NULL,
    "clientDistanceMeters" INTEGER NOT NULL,
    "isWithinGeofence" BOOLEAN NOT NULL,
    "biometricTokenRef" TEXT,
    "photoUrl" TEXT,
    "notes" TEXT,

    CONSTRAINT "crew_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_checklists" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" "LogisticsStage" NOT NULL DEFAULT 'LOAD_IN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logistics_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantityExpected" INTEGER NOT NULL,
    "quantityActual" INTEGER NOT NULL DEFAULT 0,
    "condition" "ItemCondition" NOT NULL DEFAULT 'GOOD',
    "verifiedByUserId" TEXT,
    "proofImageUrl" TEXT,
    "notes" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_organizationId_phoneNumber_key" ON "users"("organizationId", "phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "user_device_tokens_fcmToken_key" ON "user_device_tokens"("fcmToken");

-- CreateIndex
CREATE INDEX "rundown_items_eventId_orderIndex_idx" ON "rundown_items"("eventId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "event_crews_eventId_userId_key" ON "event_crews"("eventId", "userId");

-- CreateIndex
CREATE INDEX "crew_attendances_eventCrewId_type_idx" ON "crew_attendances"("eventCrewId", "type");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device_tokens" ADD CONSTRAINT "user_device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rundown_items" ADD CONSTRAINT "rundown_items_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rundown_items" ADD CONSTRAINT "rundown_items_picUserId_fkey" FOREIGN KEY ("picUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_crews" ADD CONSTRAINT "event_crews_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_crews" ADD CONSTRAINT "event_crews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_attendances" ADD CONSTRAINT "crew_attendances_eventCrewId_fkey" FOREIGN KEY ("eventCrewId") REFERENCES "event_crews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_checklists" ADD CONSTRAINT "logistics_checklists_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "logistics_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
