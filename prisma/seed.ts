import { prisma } from "../src/lib/db/client";
import { runSeed } from "../src/lib/seed/run";

// Run with: SEED_PASSWORD=... npm run db:seed
runSeed(prisma, { seedPassword: process.env.SEED_PASSWORD, contentDir: "content/courses" })
  .then((r) => console.log(`Seeded ${r.courses} course files and ${r.banks} question banks (${r.updated} courses updated with new content).`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
