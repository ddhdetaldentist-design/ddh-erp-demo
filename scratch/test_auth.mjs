import { readFileSync } from "fs";
import bcrypt from "bcryptjs";

const raw = readFileSync("./src/data/mock-data.json", "utf-8");
const data = JSON.parse(raw);

console.log("=== USERS IN MOCK-DATA.JSON ===");
console.log("Total users:", data.users.length);

for (const u of data.users) {
  console.log(`\nEmail: ${u.email}`);
  console.log(`Name: ${u.name}`);
  console.log(`Role: ${u.role}`);
  console.log(`isActive: ${u.isActive} (${typeof u.isActive})`);
  console.log(`Password in DB: ${u.password}`);
  const match = await bcrypt.compare("demo123456", u.password);
  console.log(`bcrypt.compare('demo123456', hash): ${match}`);
}
