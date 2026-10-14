# Task Instructions - Backend Implementation
**Target Engine:** AI Coding Agent / Backend Engineer  
**Language/Framework:** TypeScript, Express.js  
**ORM:** Prisma ORM (PostgreSQL)  

---

## Phase 1: Environment Setup & Project Scaffolding
- [x] Inisialisasi package: `express`, `dotenv`, `cors`, `helmet`, `zod`, `jsonwebtoken`, `bcryptjs`, `@prisma/client`, `firebase-admin`, `multer`.
- [x] Inisialisasi TypeScript (`tsconfig.json`), konfigurasi path aliases (`@/controllers`, `@/routes`, `@/services`, `@/middlewares`, `@/utils`).
- [x] Buat file konfigurasi Prisma `prisma/schema.prisma` yang memuat tabel:
  - `organizations`, `users`, `user_device_tokens`, `events`, `rundown_items`, `event_crews`, `crew_attendances`, `logistics_checklists`, `checklist_items`.
- [x] Jalankan migrasi basis data awal: `npx prisma migrate dev --name init_crewsync_db`.
- [x] Buat skrip seeder `prisma/seed.ts` yang berisi data dummy: 1 organisasi, 1 akun planner, 3 akun kru, dan 1 event aktif lengkap dengan koordinat venue.

## Phase 2: Authentication & Middleware (Direct Credential)
- [x] Implementasikan endpoint `POST /api/v1/auth/register` untuk pendaftaran akun organisasi baru dan user owner.
- [x] Implementasikan endpoint `POST /api/v1/auth/login` menerima identifier (email atau nomor HP) + password, menghasilkan token JWT.
- [x] Buat middleware `authenticateJWT`: Validasi token Bearer, sematkan payload `userId`, `organizationId`, dan `role` ke dalam objek `req.user`.
- [x] Buat middleware `requireRole(allowedRoles)` untuk otorisasi akses (ADMIN, PLANNER, CREW).
- [x] Implementasikan endpoint `POST /api/v1/auth/fcm-token` untuk mendaftarkan dan memperbarui token FCM perangkat.

## Phase 3: Events & Crew Management
- [x] CRUD Endpoint `events`:
  - `POST /api/v1/events`: Membuat event dengan atribut nama, tanggal, `venue_lat`, `venue_lng`, dan `geofence_radius_meters`.
  - `GET /api/v1/events`: Menampilkan daftar event terfilter berdasarkan tenant pengguna.
  - `GET /api/v1/events/:id`: Menampilkan detail event lengkap termasuk konfigurasi radius.
- [x] Endpoint penugasan kru:
  - `POST /api/v1/events/:id/crews`: Menetapkan kru ke suatu event beserta shift dan `assigned_role`.
  - `GET /api/v1/events/:id/crews`: Menampilkan daftar kru yang ditugaskan pada event tertentu.

## Phase 4: Rundown Engine & FCM Broadcaster
- [x] CRUD Endpoint `rundown_items`:
  - `POST /api/v1/events/:id/rundown`: Menambahkan item rundown baru.
  - `PATCH /api/v1/events/:id/rundown/reorder`: Mengubah urutan indeks (`order_index`) secara massal.
  - `PATCH /api/v1/events/:id/rundown/:itemId/status`: Memperbarui status item (`PENDING`, `ACTIVE`, `COMPLETED`, `SKIPPED`).
- [x] Service Firebase Admin:
  - Buat helper `sendEventTopicNotification(eventId, payload)`.
  - Otomatis kirim pesan data FCM ke topik `event_{eventId}` setiap kali status sesi berubah menjadi `ACTIVE`.

## Phase 5: Crew Attendance (Biometric & Photo with Client Geofence)
- [x] Siapkan konfigurasi storage handler Multer untuk menangani penyimpanan berkas foto selfie.
- [x] Implementasikan endpoint `POST /api/v1/events/:id/attendances`:
  - Validasi payload:
    - `type` (`CHECK_IN` atau `CHECK_OUT`)
    - `method` (`BIOMETRIC` atau `PHOTO`)
    - `client_lat` (number)
    - `client_lng` (number)
    - `client_distance_meters` (number)
    - `is_within_geofence` (boolean)
    - `biometric_token_ref` (string, opsional jika method = BIOMETRIC)
    - File `photo` (wajib diunggah jika method = PHOTO)
  - Simpan catatan ke tabel `crew_attendances`.
- [x] Endpoint `GET /api/v1/events/:id/attendances`: Rekap data presensi untuk monitoring admin.

## Phase 6: Logistics Checklists
- [x] Endpoint CRUD untuk `logistics_checklists` dan `checklist_items`.
- [x] Endpoint verifikasi kondisi fisik: `PATCH /api/v1/checklists/items/:itemId/verify` untuk memperbarui jumlah fisik, status kelayakan (`GOOD`, `DAMAGED`, `MISSING`), dan foto bukti jika terjadi kerusakan.