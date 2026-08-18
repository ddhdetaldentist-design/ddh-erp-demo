import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function test() {
  console.log("--- Testing Mock DB User Fetch ---");
  const users = await prisma.user.findMany();
  console.log("Total users in mock DB:", users.length);
  for (const u of users) {
    console.log(`User: ${u.email} | Role: ${u.role} | Active: ${u.isActive} | Pass: ${u.password?.substring(0, 10)}...`);
  }

  const emailToTest = "admin@ddh.demo";
  console.log(`\n--- Testing findUnique with email: ${emailToTest} ---`);
  const found = await prisma.user.findUnique({
    where: { email: emailToTest, isActive: true },
    include: { rolePermission: true }
  });
  console.log("Found user:", found ? found.name : "NULL");

  if (found) {
    const isMatch = await bcrypt.compare("demo123456", found.password);
    console.log("bcrypt.compare('demo123456') result:", isMatch);
  }
}

test().catch(console.error);
