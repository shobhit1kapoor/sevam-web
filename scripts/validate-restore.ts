/**
 * P0-B4 — Restore Smoke Test
 *
 * Run after any database restore to validate data integrity.
 * Uses the shared Prisma client from lib/db/prisma.
 *
 * Usage:
 *   npx tsx scripts/validate-restore.ts
 */

import { prisma } from "@/lib/db/prisma";

async function main() {
  console.log("Running restore validation checks...\n");

  const [userCount, jobCount, paymentCount, workerCount] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.payment.count(),
    prisma.workerProfile.count(),
  ]);

  console.log("✅ Row counts:");
  console.log(`   Users:          ${userCount}`);
  console.log(`   WorkerProfiles: ${workerCount}`);
  console.log(`   Jobs:           ${jobCount}`);
  console.log(`   Payments:       ${paymentCount}`);

  const errors: string[] = [];

  if (userCount === 0)
    errors.push("❌ No users found — restore may be incomplete");
  if (jobCount === 0)
    errors.push("⚠️  No jobs found — may be expected for a fresh restore");

  // Referential integrity spot-check: jobs whose customer no longer exists.
  // Prisma does not allow `{ customer: { is: null } }` on required relations;
  // use a raw aggregate instead.
  const [{ count: orphanedJobs }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) AS count
    FROM "Job" j
    WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = j."customerId")
  `;
  if (orphanedJobs > 0n) {
    errors.push(`❌ ${orphanedJobs} jobs with missing customer FK — database integrity issue`);
  }

  if (errors.length > 0) {
    console.error("\nValidation failures:");
    errors.forEach((e) => console.error(`  ${e}`));
    process.exitCode = 1;
    return;
  }

  console.log("\n✅ All checks passed. Restore looks healthy.");
}

main()
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
