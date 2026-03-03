import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  const adminName = process.env.ADMIN_BOOTSTRAP_NAME ?? "Admin";
  const adminEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@college.local").toLowerCase();
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "Alpha1234*";

  const passwordHash = await hashPassword(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: "ADMIN",
      isActive: true,
      passwordHash
    },
    create: {
      name: adminName,
      email: adminEmail,
      role: "ADMIN",
      isActive: true,
      passwordHash
    }
  });

  await prisma.authRateLimit.deleteMany({
    where: {
      key: {
        in: [`login:${adminName.toLowerCase()}`, `login:${adminEmail}`]
      }
    }
  });

  console.log(`Admin ensured: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
