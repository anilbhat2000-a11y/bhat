import { prisma } from "../src/lib/db/client";
import { createAdmin } from "../src/lib/admin/demo";

// Creates a real admin account. The password comes from ADMIN_PASSWORD, so it does not end
// up in the shell history as an argument. Run:
//   ADMIN_PASSWORD='...' npm run db:create-admin -- "Full Name" name@company.in
const [name, email] = process.argv.slice(2);
createAdmin(prisma, { name: name ?? "", email: email ?? "", password: process.env.ADMIN_PASSWORD ?? "" })
  .then((r) => {
    if (!r.ok) {
      console.error(r.error);
      process.exitCode = 1;
      return;
    }
    console.log(`${r.created ? "Created" : "Updated"} admin ${email}.`);
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
