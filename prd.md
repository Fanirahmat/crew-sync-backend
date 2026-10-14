# Product Requirement Document (PRD) — Backend Service
**Project Name:** CrewSync (Backend API & Notification Service)  
**Runtime:** Node.js (Express.js + TypeScript)  
**Database:** PostgreSQL with Prisma ORM  
**Notification Engine:** Firebase Cloud Messaging (FCM)

---

## 1. Executive Summary & Problem Statement
Operasional vendor acara di Indonesia (Wedding Organizer, Event Organizer, Katering) sering menghadapi miskomunikasi cue rundown, absensi kru lepas (*freelance*) yang fiktif, serta kehilangan aset/inventaris sewaan di lokasi acara. 

**CrewSync Backend** bertindak sebagai *core engine* yang menyediakan API RESTful yang cepat, aman, dan modular untuk mengelola siklus operasional: master data organisasi multi-tenant, penjadwalan acara, transmisi cue rundown via FCM, penerimaan absensi terverifikasi (metode biometrik/foto dengan evaluasi geofence di perangkat), serta checklist logistik *load-in/load-out*.

---

## 2. Core Architectural Decisions

### 2.1 Multi-Tenancy Architecture
* **Model:** Shared Database, Shared Schema dengan isolasi berbasis kolom `organization_id`.
* **Klaim Token:** Setiap request terotentikasi memuat klaim tenant (`organizationId`, `userId`, `role`) di dalam JWT.
* **Query Enforcing:** Seluruh pemanggilan Prisma ORM wajib menyertakan filter `where: { organizationId }` untuk memastikan isolasi data mutlak antar-vendor.

### 2.2 Autentikasi Langsung (Development Phase)
* Menghilangkan dependensi pihak ketiga (SMS/WhatsApp gateway) pada fase awal.
* Kredensial langsung: Identifier (`phone_number` atau `email`) + `password` (terenkripsi *bcrypt*).
* Menghasilkan stateless Bearer JWT dengan durasi masa aktif yang terkonfigurasi.

### 2.3 Evaluasi Geofence Sisi Klien (Zero-Server-Load)
* Endpoint detail event mengekspos koordinat venue (`venue_lat`, `venue_lng`) dan acuan radius (`geofence_radius_meters`).
* Perhitungan jarak dan evaluasi geofence diproses 100% secara lokal oleh mobile client untuk menghindari beban kalkulasi berkala di server.
* Backend hanya bertindak sebagai pencatat data: menerima `client_lat`, `client_lng`, `client_distance_meters`, dan boolean `is_within_geofence`.

### 2.4 Metode Absensi Kru Lapangan (Dual-Method)
Presensi mendukung dua metode fleksibel:
1. `BIOMETRIC`: Kru memvalidasi sidik jari/Face ID di perangkat. Tidak membutuhkan pengunggahan file gambar (cukup `biometric_token_ref`).
2. `PHOTO`: Kru mengunggah swafoto di lokasi venue. Diproses via Multer dan disimpan URL-nya ke database.

### 2.5 Realtime Cue via FCM Topic Messaging
* Tanpa koneksi WebSocket stateful yang membebani memori server.
* Kru berlangganan topik `event_{eventId}` dari mobile app.
* Setiap pembaruan status sesi rundown memicu pengiriman FCM Data Message & Notification ke topik terkait.

---

## 3. Clean Architecture Code Structure

Struktur kode dirancang dengan pemisahan tanggung jawab yang tegas (*Separation of Concerns*) agar mudah dipahami oleh developer maupun AI coding agent:

```text
backend/
├── prisma/
│   ├── schema.prisma         # Definisi model database, enum, & relasi
│   ├── migrations/           # Riwayat migrasi SQL
│   └── seed.ts               # Data seeder awal pengujian
├── src/
│   ├── config/               # Inisialisasi lingkungan & modul eksternal
│   │   ├── env.ts            # Validasi environment variables (Zod/Envalid)
│   │   ├── database.ts       # Prisma Client singleton instance
│   │   ├── firebase.ts       # Inisialisasi Firebase Admin SDK
│   │   └── storage.ts        # Konfigurasi upload/Multer
│   │
│   ├── types/                # TypeScript interface & custom declaration
│   │   ├── express.d.ts      # Augmentasi Express Request (user context)
│   │   └── common.ts         # Response payload & pagination types
│   │
│   ├── middlewares/          # Interceptor HTTP request
│   │   ├── auth.middleware.ts       # Verifikasi JWT Bearer token
│   │   ├── role.middleware.ts       # Kontrol akses berbasis peran (RBAC)
│   │   ├── tenant.middleware.ts     # Injeksi & validasi context organizationId
│   │   ├── validate.middleware.ts   # Skema validator input request (Zod)
│   │   └── error.middleware.ts      # Global centralized error handler
│   │
│   ├── routes/               # Routing definisi endpoint Express
│   │   ├── index.ts          # Root API route aggregator (/api/v1)
│   │   ├── auth.routes.ts    # /api/v1/auth
│   │   ├── event.routes.ts   # /api/v1/events
│   │   ├── rundown.routes.ts # /api/v1/rundowns
│   │   ├── crew.routes.ts    # /api/v1/crews & /api/v1/attendances
│   │   └── logistics.routes.ts # /api/v1/logistics
│   │
│   ├── controllers/          # HTTP transport layer (Request/Response handling)
│   │   ├── auth.controller.ts
│   │   ├── event.controller.ts
│   │   ├── rundown.controller.ts
│   │   ├── attendance.controller.ts
│   │   └── logistics.controller.ts
│   │
│   ├── services/             # Pure business logic layer
│   │   ├── auth.service.ts
│   │   ├── event.service.ts
│   │   ├── rundown.service.ts
│   │   ├── attendance.service.ts
│   │   ├── logistics.service.ts
│   │   └── fcm.service.ts    # Service wrapper pengiriman push topic FCM
│   │
│   ├── repositories/         # Database access abstraction (Prisma queries)
│   │   ├── organization.repository.ts
│   │   ├── user.repository.ts
│   │   ├── event.repository.ts
│   │   ├── rundown.repository.ts
│   │   ├── attendance.repository.ts
│   │   └── logistics.repository.ts
│   │
│   ├── utils/                # Helper murni & formatting
│   │   ├── response.util.ts  # Format konsisten API (success, error, meta)
│   │   ├── password.util.ts  # Hashing & verifikasi bcrypt
│   │   └── jwt.util.ts       # Generator & verifikator token
│   │
│   ├── app.ts                # Assembly middleware & Express app
│   └── server.ts             # Entry point bootstrapping HTTP listener
├── .env.example
├── tsconfig.json
└── package.json
```

---

## 4. Scope of Entities & Database Models
1. `organizations`: Profil tenant WO/EO.
2. `users`: Akun owner, planner, koordinator, dan kru.
3. `user_device_tokens`: Token perangkat FCM untuk broadcast dan direct notification.
4. `events`: Data master acara, lokasi venue, dan batas radius meter.
5. `rundown_items`: Daftar urutan kegiatan beserta status live cue (`PENDING`, `ACTIVE`, `COMPLETED`, `SKIPPED`).
6. `event_crews`: Penugasan user ke event tertentu beserta peran dan shift kerja.
7. `crew_attendances`: Log kehadiran kru mencakup jenis (`CHECK_IN`/`CHECK_OUT`), metode (`BIOMETRIC`/`PHOTO`), koordinat GPS, dan status geofence.
8. `logistics_checklists` & `checklist_items`: Daftar pengecekan kondisi barang *load-in/load-out*.

---

## 5. Non-Functional Requirements
* **Response Time:** API P95 latency < 150ms untuk endpoint operasional utama.
* **Storage Limit:** File foto absensi/bukti logistik dibatasi maksimal 5MB per upload.
* **Data Integrity:** Status rundown dan perubahan shift wajib menggunakan timestamp UTC yang konsisten.
* **Separation of Concerns:** Controller dilarang memanggil Prisma secara langsung; seluruh logika data bisnis wajib melewati Service dan Repository layer.
