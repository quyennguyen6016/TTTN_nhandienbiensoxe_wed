/**
 * Script tạo tài khoản admin mặc định
 * Chạy: node scripts/seed-admin.js
 * Chạy 1 lần sau khi migration xong
 */

const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ADMIN_ACCOUNTS = [
  {
    username: "admin",
    password: "admin123",
    fullName: "Administrator",
    email: "admin@platevision.local",
    role: "ADMIN",
  },
];

async function main() {
  console.log("Bắt đầu seed tài khoản admin...\n");

  for (const acc of ADMIN_ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { username: acc.username } });
    if (existing) {
      console.log(`⚠️  Tài khoản "${acc.username}" đã tồn tại, bỏ qua.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(acc.password, 10);
    await prisma.user.create({
      data: {
        username:     acc.username,
        passwordHash: passwordHash,
        fullName:     acc.fullName,
        email:        acc.email,
        role:         acc.role,
        isActive:     true,
      },
    });
    console.log(`✅ Tạo tài khoản "${acc.username}" thành công.`);
    console.log(`   Role: ${acc.role} | Password: ${acc.password}\n`);
  }

  console.log("Seed xong!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
