import { getPrisma } from "../src/server/db/client";

const email = process.argv[2]?.trim().toLowerCase() ?? "";
const confirmed = process.argv[3] === "CONFIRM_ADMIN_PROMOTION";

if (!email || !email.includes("@") || email.length > 254) {
  console.error("Provide one existing account email as the first argument.");
  process.exit(1);
}
if (!confirmed) {
  console.error("Promotion requires the exact confirmation token CONFIRM_ADMIN_PROMOTION. No account was changed.");
  process.exit(1);
}

const prisma = getPrisma();
try {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!user) {
    console.error("No account matched that email. No account was changed.");
    process.exitCode = 1;
  } else if (user.role === "ADMIN") {
    console.info("The account is already an ADMIN.");
  } else {
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);
    console.info("Account promoted to ADMIN. Existing sessions were revoked; sign in again.");
  }
} catch {
  console.error("Admin promotion failed. No connection details were printed.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
