/**
 * P0-B4 — Restore Smoke Test
 *
 * Run after any database restore to validate data integrity.
 * Usage:
 *   npx tsx scripts/validate-restore.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  if (userCount === 0)    errors.push("❌ No users found — restore may be incomplete");
  if (jobCount === 0)     errors.push("⚠️  No jobs found — may be expected for a fresh restore");

  // Referential integrity spot-check
  const orphanedJobs = await prisma.job.count({
    where: { customer: { is: null } },
  });
  if (orphanedJobs > 0) {
    errors.push(`❌ ${orphanedJobs} jobs with missing customer FK — database integrity issue`);
  }

  if (errors.length > 0) {
    console.error("\nValidation failures:");
    errors.forEach((e) => console.error(`  ${e}`));
    process.exit(1);
  }

  console.log("\n✅ All checks passed. Restore looks healthy.");
}

main()
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
