import { prisma } from "../src/lib/db/client";
import { deactivateDemoAccounts } from "../src/lib/admin/demo";

// Deactivates the seeded demo accounts. Run: npm run db:deactivate-demo
deactivateDemoAccounts(prisma)
  .then((r) => {
    if (!r.ok) {
      console.error(r.error);
      process.exitCode = 1;
      return;
    }
    console.log(r.deactivated.length ? `Deactivated: ${r.deactivated.join(", ")}` : "The demo accounts were already deactivated.");
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
