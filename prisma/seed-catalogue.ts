import { prisma } from "../src/lib/db/client";
import { loadCatalogue, seedCatalogueDrafts } from "../src/lib/catalogue/catalogue";

// Creates draft course shells (with modules) for catalogue courses not yet in the portal.
// Run after the main seed: npm run db:seed-catalogue
seedCatalogueDrafts(prisma, loadCatalogue())
  .then((n) => console.log(`Created ${n} draft courses from the catalogue.`))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
