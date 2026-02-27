# P0-B4 — Database Backup & Recovery Runbook

## 1. Automated Backups (Supabase Pro)

Supabase Pro enables **daily automatic backups** with a 7-day retention window.
Supabase Enterprise enables **Point-in-Time Recovery (PITR)** with per-second granularity.

### Enable

1. Go to **Supabase Dashboard → Project → Database → Backups**
2. Confirm **"Daily backups"** is enabled (automatic on Pro+)
3. For PITR, upgrade to **Supabase Enterprise** and enable WAL archiving from the same page

---

## 2. Manual On-Demand Backup

Run any time before a major migration or deploy:

```bash
# Export full schema + data (requires pg_dump and Supabase DB URL)
pg_dump \
  --format=custom \
  --no-acl \
  --no-owner \
  "$DATABASE_URL" \
  -f "backups/sevam_$(date +%Y%m%d_%H%M%S).dump"
```

Store the `.dump` file in a separate storage bucket (Supabase Storage, S3, GCS).

---

## 3. Restore Procedure

### From Supabase Dashboard (recommended)

1. Go to **Database → Backups**
2. Select the desired backup date
3. Click **"Restore"** — Supabase creates a new project with the restored data
4. Update `DATABASE_URL` in your deployment environment to point to the restored project
5. Validate by running the smoke-test script below

### From a `.dump` file

```bash
# Create a fresh target database first, then:
pg_restore \
  --no-acl \
  --no-owner \
  --dbname "$TARGET_DATABASE_URL" \
  backups/sevam_20260224_120000.dump
```

---

## 4. Point-in-Time Recovery (PITR)

> Requires Supabase Enterprise / WAL archiving enabled.

1. Go to **Database → Backups → Point in Time**
2. Select the exact date and time to restore to
3. Confirm — Supabase streams WAL logs up to the specified moment
4. New project is created; swap connection string

---

## 5. Restore Smoke Test

After any restore, run this script to validate data integrity:

```typescript
// scripts/validate-restore.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const jobCount = await prisma.job.count();
  const paymentCount = await prisma.payment.count();

  console.log("✅ Restore validation:");
  console.log(`   Users:    ${userCount}`);
  console.log(`   Jobs:     ${jobCount}`);
  console.log(`   Payments: ${paymentCount}`);

  if (userCount === 0) throw new Error("❌ No users found — restore may be incomplete");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Run with:
```bash
npx tsx scripts/validate-restore.ts
```

---

## 6. Backup Schedule Recommendation

| Environment | Frequency    | Retention | Method               |
|-------------|--------------|-----------|----------------------|
| Production  | Daily (auto) | 7 days    | Supabase Pro backups |
| Production  | Continuous   | 7 days    | PITR (Enterprise)    |
| Before deploy | On-demand  | 30 days   | `pg_dump` to S3      |
| Weekly      | Weekly       | 90 days   | `pg_dump` archive    |

---

## 7. Alert Setup

In Supabase Dashboard → **Integrations → Alerts**, configure:
- Notify on backup failure (Slack / PagerDuty webhook)
- Notify when storage usage exceeds 80%

In Sentry (P0-B3), payment and auth errors use `captureCritical()` which sets
Sentry severity to `fatal` — configure a Sentry alert rule to page on-call for
`level:fatal` events.
