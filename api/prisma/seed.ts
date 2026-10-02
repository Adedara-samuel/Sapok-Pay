import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

/**
 * Seeds the one AdminUser (platform operator) account. Merchants are never
 * seeded — they sign up for real through POST /auth/merchant/signup.
 */
async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@sapokpay.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: "SAPOK Pay Admin" },
  });

  console.log(`Seeded admin user: ${admin.email} (id: ${admin.id})`);
  console.log(`Password: ${password} — local dev only, rotate before any real deployment.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
