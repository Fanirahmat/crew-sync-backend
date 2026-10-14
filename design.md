# Technical Design Document - Backend Architecture
**Architecture:** RESTful API + Firebase Cloud Messaging  
**Database:** PostgreSQL via Prisma  

---

## 1. System Architecture Diagram


┌───────────────────────────────┐
│       Web Dashboard (Admin)   │
└───────────────┬───────────────┘
                │ HTTP REST
                ▼
┌────────────────────────────────────────────────────────┐
│                 CrewSync Express.js API                │
│                                                        │
│  ┌─────────────────┐ ┌───────────────┐ ┌────────────┐  │
│  │ Auth & Tenant   │ │ Event/Rundown │ │ Attendance │  │
│  │ Middleware      │ │ Service       │ │ Service    │  │
│  └─────────────────┘ └───────┬───────┘ └────────────┘  │
└──────────────────────────────┼─────────────────────────┘
                               │ Trigger Notification
                               ▼
┌───────────────────────┐      │
│  Firebase FCM Engine  │<─────┘
└──────────┬────────────┘
           │ Push Topic Message (/topics/event_{id})
           ▼
┌───────────────────────────────┐
│       Mobile App (Crew)       │
│  - Evaluasi GPS vs Radius     │
│  - Kirim Presensi & Checklist │
└───────────────────────────────┘

## 2. Prisma Database Schema
Cuplikan kode
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  OWNER
  PLANNER
  COORDINATOR
  CREW
}

enum EventStatus {
  DRAFT
  PUBLISHED
  ONGOING
  COMPLETED
  CANCELLED
}

enum RundownStatus {
  PENDING
  ACTIVE
  COMPLETED
  SKIPPED
}

enum AttendanceType {
  CHECK_IN
  CHECK_OUT
}

enum VerificationMethod {
  BIOMETRIC
  PHOTO
}

enum ItemCondition {
  GOOD
  DAMAGED
  MISSING
}

enum LogisticsStage {
  LOAD_IN
  LOAD_OUT
  POST_EVENT
}

model Organization {
  id                String   @id @default(uuid())
  name              String
  subscriptionTier  String   @default("free")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  users             User[]
  events            Event[]

  @@map("organizations")
}

model User {
  id              String            @id @default(uuid())
  organizationId  String
  fullName        String
  phoneNumber     String
  email           String?
  passwordHash    String
  role            Role              @default(CREW)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  organization    Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  deviceTokens    UserDeviceToken[]
  eventCrews      EventCrew[]
  picRundowns     RundownItem[]
  verifiedItems   ChecklistItem[]

  @@unique([organizationId, phoneNumber])
  @@map("users")
}

model UserDeviceToken {
  id        String   @id @default(uuid())
  userId    String
  fcmToken  String   @unique
  platform  String   // android / ios
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_device_tokens")
}

model Event {
  id                   String                @id @default(uuid())
  organizationId       String
  title                String
  category             String
  eventDate            DateTime
  venueName            String
  venueLat             Decimal               @db.Decimal(10, 7)
  venueLng             Decimal               @db.Decimal(10, 7)
  geofenceRadiusMeters Int                   @default(100)
  status               EventStatus           @default(DRAFT)
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt

  organization         Organization          @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  rundowns             RundownItem[]
  crews                EventCrew[]
  checklists           LogisticsChecklist[]

  @@map("events")
}

model RundownItem {
  id              String        @id @default(uuid())
  eventId         String
  orderIndex      Int
  startTime       DateTime
  endTime         DateTime
  title           String
  description     String?
  locationSection String?
  picUserId       String?
  status          RundownStatus @default(PENDING)
  actualStartedAt DateTime?
  actualEndedAt   DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  event           Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  picUser         User?         @relation(fields: [picUserId], references: [id], onDelete: SetNull)

  @@index([eventId, orderIndex])
  @@map("rundown_items")
}

model EventCrew {
  id           String            @id @default(uuid())
  eventId      String
  userId       String
  assignedRole String
  shiftStart   DateTime?
  shiftEnd     DateTime?
  feeAmount    Decimal?          @db.Decimal(12, 2)
  createdAt    DateTime          @default(now())

  event        Event             @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user         User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  attendances  CrewAttendance[]

  @@unique([eventId, userId])
  @@map("event_crews")
}

model CrewAttendance {
  id                   String             @id @default(uuid())
  eventCrewId          String
  type                 AttendanceType
  method               VerificationMethod
  recordedAt           DateTime           @default(now())
  clientLat            Decimal            @db.Decimal(10, 7)
  clientLng            Decimal            @db.Decimal(10, 7)
  clientDistanceMeters Int
  isWithinGeofence     Boolean
  biometricTokenRef    String?
  photoUrl             String?
  notes                String?

  eventCrew            EventCrew          @relation(fields: [eventCrewId], references: [id], onDelete: Cascade)

  @@index([eventCrewId, type])
  @@map("crew_attendances")
}

model LogisticsChecklist {
  id        String          @id @default(uuid())
  eventId   String
  name      String
  stage     LogisticsStage  @default(LOAD_IN)
  createdAt DateTime        @default(now())

  event     Event           @relation(fields: [eventId], references: [id], onDelete: Cascade)
  items     ChecklistItem[]

  @@map("logistics_checklists")
}

model ChecklistItem {
  id               String             @id @default(uuid())
  checklistId      String
  itemName         String
  quantityExpected Int
  quantityActual   Int                @default(0)
  condition        ItemCondition      @default(GOOD)
  verifiedByUserId String?
  proofImageUrl    String?
  notes            String?
  verifiedAt       DateTime?

  checklist        LogisticsChecklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  verifiedByUser   User?              @relation(fields: [verifiedByUserId], references: [id], onDelete: SetNull)

  @@map("checklist_items")
}
## 3. Key API Endpoints Specification
### 3.1 Authentication
POST /api/v1/auth/login

Request Body:

JSON
{
  "identifier": "081234567890",
  "password": "rahasiaPassword"
}
Response (200 OK):

JSON
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "u-1234-uuid",
    "fullName": "Dian Sastrowardoyo",
    "role": "COORDINATOR",
    "organizationId": "org-5678-uuid"
  }
}
### 3.2 Fetch Event Detail (Spatial Parameters for Client)
GET /api/v1/events/:id

Response (200 OK):

JSON
{
  "id": "evt-001-uuid",
  "title": "Resepsi Pernikahan Galih & Ratna",
  "venueName": "Balai Kartini Exhibition Hall",
  "venueLat": -6.2361200,
  "venueLng": 106.8284100,
  "geofenceRadiusMeters": 150,
  "status": "ONGOING"
}
### 3.3 Crew Attendance Submission
POST /api/v1/events/:id/attendances

Headers: Authorization: Bearer <token>, Content-Type: multipart/form-data

Request Payload (Form-Data):

type: CHECK_IN

method: BIOMETRIC atau PHOTO

clientLat: -6.2361500

clientLng: 106.8284500

clientDistanceMeters: 5

isWithinGeofence: true

biometricTokenRef: "biometric_signature_token" (hanya diisi jika method = BIOMETRIC)

photo: [Binary Image] (hanya dilampirkan jika method = PHOTO)

Response (201 Created):

JSON
{
  "success": true,
  "message": "Presensi CHECK_IN berhasil dicatat.",
  "data": {
    "id": "att-999-uuid",
    "recordedAt": "2026-10-11T07:15:00.000Z",
    "method": "BIOMETRIC",
    "isWithinGeofence": true
  }
}

## 4. FCM Topic Broadcast Implementation
TypeScript
import admin from 'firebase-admin';

export const publishRundownCue = async (
  eventId: string, 
  item: { id: string; title: string; status: string; startTime: Date }
) => {
  const payload: admin.messaging.Message = {
    topic: `event_${eventId}`,
    data: {
      eventType: 'RUNDOWN_CUE_UPDATE',
      itemId: item.id,
      title: item.title,
      status: item.status,
      startTime: item.startTime.toISOString()
    },
    notification: {
      title: `Cue Acara: ${item.title}`,
      body: `Status sesi saat ini: ${item.status}`
    }
  };

  return await admin.messaging().send(payload);
};