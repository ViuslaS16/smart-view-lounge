# SmartView Lounge — Project Context & Stitch Prompt Reference

> **Classification:** Internal · AviterX Development Agency  
> **Client:** Savin Tharusha  
> **Built by:** AviterX Development Agency  
> **Version:** 1.0 · April 2025

---

## What is SmartView Lounge?

SmartView Lounge is **Sri Lanka's first fully automated, no-human private movie theater**. It is a boutique cinema experience where customers can discover, book, pay for, and enjoy a completely private screening session — with zero on-site staff involvement at any point.

There are no cashiers, no ticket counters, no ushers, and no staff on the premises during operation. Every function that would traditionally require a human — booking, payment, access control, session management, and shutdown — is handled entirely by software, IoT smart switches, and automated notifications.

The target audience is couples, small groups, and individuals in Sri Lanka who want a premium, private, uninterrupted cinema experience without the social context of a public theater.

---

## The Core Problem It Solves

Running a private screening room traditionally requires at least one staff member on duty at all times — to take bookings, collect payments, turn on equipment, manage session time, and shut down after. This makes 24/7 operation economically unviable for a small boutique venue.

SmartView Lounge removes this constraint entirely. The system:

- Handles all bookings and payments automatically through the mobile app
- Verifies every customer's identity before their first booking using NIC (National Identity Card) image upload
- Sends automated SMS notifications to the admin at the right moments so they can control the physical theater remotely via a smart switch app
- Sends automated SMS reminders to the customer during their session so they know when their time is ending
- Allows customers to extend their session on the spot if the next slot is free, without any human involvement

The result is a venue that can operate any hour of the day with a single part-time admin managing everything remotely from their phone.

---

## How It Works — End to End

### Customer journey

1. Customer downloads the SmartView Lounge app
2. Customer registers with their full name, mobile number, email, password, and uploads a photo of their NIC front side
3. Account is placed in `pending_verification` status — the admin reviews and approves the NIC manually from the dashboard
4. Once approved, the customer can browse available time slots on a calendar UI
5. Customer selects a date, start time, and duration (minimum 1 hour, in 30-minute increments)
6. Customer is redirected to PayHere hosted checkout — no card data touches the app servers
7. PayHere sends a webhook to the backend confirming payment
8. System confirms the booking, sends a receipt email, and SMS-alerts the admin to turn on the theater
9. System creates a Google Calendar event on the admin's calendar with a 30-minute popup reminder
10. Customer arrives and enjoys their private session
11. 15 minutes before session end, customer receives an SMS reminder
12. At session end time, customer receives a shutdown warning SMS
13. 5 minutes after session end, admin receives an SMS to turn off the AC and projector
14. If the customer wants more time, they tap "Add time" in the app — the system checks for conflicts and processes an extension payment via PayHere

### Admin journey

1. Admin receives SMS when a booking is confirmed — turns on theater via smart switch app
2. Admin reviews pending NIC verifications in the dashboard and approves or rejects them
3. Admin monitors bookings, revenue, and customer activity from the dashboard
4. Admin receives Google Calendar events automatically for every confirmed booking with 30-minute reminders
5. Admin receives SMS 5 minutes after each session ends — turns off AC and projector via smart switch app
6. In an emergency or security incident, admin can search any customer by mobile number or NIC number to instantly retrieve their identity and contact details

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15 (App Router) | Customer booking app and admin dashboard |
| Styling | Tailwind CSS v4 | Responsive UI components |
| Language | TypeScript | Type safety across the full stack |
| Database | Supabase (PostgreSQL) | All data — users, bookings, payments, audit logs |
| Auth | Supabase Auth | Email/password login, session management, RLS policies |
| File Storage | Supabase Storage | NIC image storage in a private bucket |
| API Layer | Next.js API Routes | PayHere webhook, Notify.lk triggers, scheduling logic |
| Payment | PayHere | Sri Lanka's leading payment gateway — bookings and session extensions |
| SMS | Notify.lk | Automated session reminders and admin alerts |
| Email | Resend | Payment receipts and booking confirmations |
| Background Jobs | Supabase Edge Functions + pg_cron | Scheduled SMS triggers, session expiry checks |
| Calendar | Google Calendar API | Auto-create admin calendar events on every confirmed booking |
| IoT (Phase 2) | Tuya / Smart Life API | Remote control of AC and projector |
| Hosting | Vercel + Supabase Pro | Production infrastructure at approximately $25/month |

---

## System Modules

### Module 1 — User registration and identity verification

Every user must create an account and upload a government-issued NIC image before they can book. The account remains in `pending_verification` status until the admin manually approves the NIC from the dashboard. Once approved, the account becomes `active` and booking is unlocked.

NIC images are stored in a Supabase private storage bucket. Admin access to NIC images uses signed URLs that expire in 60 seconds. Row Level Security policies enforce this at the database layer.

### Module 2 — Booking engine

The booking engine handles slot availability, conflict detection, pricing, and payment initiation. Before confirming any booking, the system performs a PostgreSQL range overlap query to check for collisions. A 15-minute buffer is enforced between sessions for cleaning and reset time (configurable by admin).

### Module 3 — PayHere payment integration

Frontend generates a signed PayHere checkout payload. User is redirected to PayHere's hosted page. On payment success, PayHere calls `/api/payhere/webhook`. The backend verifies the MD5 hash signature before processing. No card data ever touches the application servers.

### Module 4 — Email notifications via Resend

Automated emails sent at key moments: booking confirmation with receipt, account approved notification, payment receipt with itemized charge, and optional 1-hour session reminder.

### Module 5 — SMS automation via Notify.lk

A Supabase `pg_cron` job runs every 5 minutes scanning active bookings. A Supabase Edge Function on a 1-minute schedule handles high-precision triggers. Duplicate SMS prevention is handled by `sms_15min_sent` and `sms_end_sent` boolean columns on the bookings table.

SMS triggers:
- On booking confirmation → admin: "New booking confirmed. Turn on theater."
- 15 minutes before session end → customer: "Your session ends in 15 minutes."
- At session end → customer: "Session over. Theater shuts down in 5 minutes."
- 5 minutes after session end → admin: "Session ended. Please turn off AC and projector."
- On extension approved → customer: "Your session has been extended."

### Module 6 — Session extension

Customer taps "Add more time" during their active session. The app calls the API to check for any confirmed booking that would conflict with the proposed new end time. If no conflict: PayHere extension payment flow. If conflict: app displays the next session start time and blocks the extension. On successful payment, `end_time` is updated in the database and new SMS triggers are scheduled.

### Module 7 — Google Calendar integration

Admin connects their Google account via OAuth 2.0 from the dashboard settings. A refresh token is stored encrypted in Supabase. Every confirmed booking automatically creates a calendar event titled "Theater Booking — [Customer Name] | Ref: [Booking ID]" with a 30-minute popup reminder. The event includes customer mobile, duration, amount paid, and a reminder to turn on the theater. Event color is set to Blueberry (dark blue) for visual distinctiveness. The Google Calendar API is free at this usage scale.

### Module 8 — Admin dashboard

Protected Next.js section accessible only to users with the `admin` role. Features: today's bookings overview, revenue metrics (daily/weekly/monthly), pending NIC verifications with approve/reject actions, full customer list with search by mobile or NIC number, booking calendar view and list view, manual booking creation, cancellation with optional PayHere refund, sales charts, CSV export, SMS notification log, configurable pricing and session buffer, and SMS template editor.

### Module 9 — IoT smart switch control

Phase 1 (MVP): Admin receives SMS and manually turns theater on/off via the Tuya Smart Life consumer app.  
Phase 2 (v2): Backend integrates directly with the Tuya Smart API to automatically power the theater on 10 minutes before session start and off 5 minutes after session end.

---

## Database Schema

### users table

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Supabase Auth user ID |
| full_name | TEXT | Customer full name |
| mobile | TEXT UNIQUE | Sri Lankan mobile — used for all SMS |
| nic_number | TEXT | National ID card number |
| nic_image_url | TEXT | Supabase Storage path, private bucket |
| status | ENUM | `pending_verification` / `active` / `suspended` |
| role | ENUM | `customer` / `admin` |
| created_at | TIMESTAMPTZ | Account creation timestamp |

### bookings table

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Unique booking reference |
| user_id | UUID FK | References users.id |
| start_time | TIMESTAMPTZ | Session start |
| end_time | TIMESTAMPTZ | Session end — updateable for extensions |
| duration_minutes | INTEGER | Booked duration |
| status | ENUM | `pending` / `confirmed` / `cancelled` / `completed` |
| total_amount | NUMERIC(10,2) | Amount paid in LKR |
| payhere_order_id | TEXT | PayHere order reference |
| sms_15min_sent | BOOLEAN | Prevents duplicate 15-minute reminder |
| sms_end_sent | BOOLEAN | Prevents duplicate session-end SMS |
| created_at | TIMESTAMPTZ | Booking creation timestamp |

### payments table

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | Internal payment record |
| booking_id | UUID FK | References bookings.id |
| payhere_payment_id | TEXT | PayHere transaction ID |
| amount | NUMERIC(10,2) | Amount in LKR |
| type | ENUM | `booking` / `extension` |
| status | ENUM | `success` / `failed` / `refunded` |
| paid_at | TIMESTAMPTZ | Payment timestamp from PayHere |

---

## Security Architecture

| Concern | Mitigation |
|---|---|
| Identity fraud | Mandatory NIC upload with manual admin approval before any booking |
| Payment fraud | PayHere MD5 hash verification on every webhook — booking never confirmed without it |
| Data access | Supabase RLS — users can only read and write their own records |
| NIC image privacy | Private Supabase Storage bucket — signed URLs expire in 60 seconds |
| Admin routes | Next.js middleware role check on all admin paths |
| API abuse | Rate limiting on booking and payment endpoints |
| Slot manipulation | All booking writes are server-side — client cannot write directly to the database |
| Secrets | All API keys stored as Vercel environment variables only |

---

## Infrastructure and Cost

| Service | Platform | Monthly Cost |
|---|---|---|
| Frontend + API Routes | Vercel (Hobby) | Free |
| Database + Auth + Storage | Supabase Pro | ~LKR 7,500 (~$25 USD) |
| Email | Resend | Free (3,000 emails/month) |
| SMS | Notify.lk | ~LKR 0.90 per message |
| Payment processing | PayHere | 2.5–3.5% per transaction |
| Calendar | Google Calendar API | Free |

> One theater session covers the entire monthly infrastructure cost. Supabase Pro is mandatory for production — the free tier auto-pauses after 7 days of inactivity which would take the entire system offline.

---

## Delivery Timeline

| Phase | Weeks | Deliverables |
|---|---|---|
| Phase 1 | 1–2 | Project setup, Supabase schema, Auth, NIC upload, user registration |
| Phase 2 | 3–4 | Booking engine, slot availability, calendar UI, conflict detection |
| Phase 3 | 5 | PayHere integration, webhook handler, email receipt, payment confirmation |
| Phase 4 | 6 | Notify.lk SMS automation, pg_cron jobs, session lifecycle triggers |
| Phase 5 | 7 | Admin dashboard — customer list, search, approvals, bookings view |
| Phase 6 | 8 | Google Calendar API integration, admin settings, SMS template editor |
| Phase 7 | 9 | Session extension feature, revenue analytics, CSV export |
| Phase 8 | 10 | QA testing, security audit, UAT with client, production deployment |

---

## UI/UX Design Specification

### Platform
Mobile-first. iOS and Android via React Native / Expo. Primary interaction surface is the customer's smartphone.

### Design language
Dark cinematic. The visual theme is premium, intimate, and theatrical. Deep blacks with warm amber gold as the primary accent color. Inspired by boutique hotel booking apps and IMAX branding. No bright whites, no blue-tinted dark modes, no neon.

### Typography
- Display headings and prices: Playfair Display (serif)
- All UI copy, labels, buttons: DM Sans (sans-serif)
- Booking reference numbers: system monospace

### Color palette — key values
- Background root: `#0A0A0B`
- Card surface: `#13131A`
- Accent gold: `#C9933A`
- Text primary: `#F0EAE0`
- Text secondary: `#A09080`
- Success green: `#3DB87A`
- Danger red: `#E24B4A`

### Customer-facing screens
1. Onboarding — first-launch landing screen with hero and routing CTAs
2. Register + NIC upload — account creation with identity verification
3. Login — returning user authentication
4. Home / browse slots — upcoming booking hero card and slot browser
5. Booking flow — duration selection with live order summary
6. Payment confirmation — success state with receipt card
7. My bookings — full booking history with filter chips
8. Session active + extend — live countdown timer, progress bar, and extension flow

---

## Key Constraints and Decisions

- **PayHere is mandatory** — it is Sri Lanka's leading payment gateway and the only viable hosted checkout option for LKR transactions with local bank support
- **Notify.lk is mandatory** — it is the primary Sri Lankan SMS API with reliable local delivery
- **NIC verification is non-negotiable** — because the venue is unstaffed, every person who enters must be identifiable for security and liability
- **Supabase Pro is non-negotiable for production** — the free tier auto-pauses and would make the system unreliable
- **IoT automation is Phase 2** — the MVP uses manual admin SMS-triggered control to reduce Phase 1 complexity and get to market faster
- **All booking writes are server-side** — the client UI never writes directly to the database; all mutations go through Next.js API routes to prevent manipulation

---

*Document prepared by AviterX Development Agency · Confidential · All rights reserved.*
