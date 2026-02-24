# Sevam

A home services marketplace connecting customers with verified local workers. Customers can book jobs, track workers in real-time, and pay seamlessly — workers manage their jobs, earnings, and profile from a dedicated dashboard.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Database | Supabase (Postgres) + Prisma ORM |
| Auth | Custom Phone OTP + JWT (jose) |
| Real-time | Supabase Realtime |
| Maps | Google Maps API |
| Payments | Razorpay |
| Notifications | Twilio SMS + Firebase FCM |
| State | Zustand |

## Project Structure

```text
sevam-web/
├── app/
│   ├── (customer)/        # Customer-facing routes
│   │   ├── jobs/          # Browse & book services
│   │   ├── track/         # Live worker tracking
│   │   └── payment/       # Checkout & history
│   ├── (worker)/          # Worker-facing routes
│   │   ├── dashboard/     # Incoming & active jobs
│   │   ├── earnings/      # Payout history
│   │   └── profile/       # Worker profile & skills
│   └── (admin)/           # Admin panel
│       ├── analytics/     # Platform metrics
│       ├── users/         # User management
│       └── settings/      # App configuration
├── components/
│   ├── ui/                # shadcn/ui primitives
│   ├── forms/             # Form components
│   └── maps/              # Map components
├── lib/
│   ├── db/                # Prisma client
│   ├── utils/             # Shared utilities
│   └── hooks/             # Custom React hooks
├── server/
│   ├── actions/           # Next.js Server Actions
│   └── api/               # Route handlers
└── types/                 # Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Razorpay](https://razorpay.com) account
- A [Google Maps](https://console.cloud.google.com) API key with Maps JS + Places APIs enabled

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
```

Fill in the values in `.env.local` (see [Environment Variables](#environment-variables) below).

```bash
# Push the database schema
npx prisma db push

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database
DATABASE_URL=

# JWT / Auth
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
OTP_SECRET=

# Twilio SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Firebase Cloud Messaging
FCM_SERVICE_ACCOUNT_JSON=

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Lint with ESLint
```
