import type { PrismaClient } from "@prisma/client";
import { mockPrisma, resetMockDatabase, getMockStore } from "./mock-db";

// Export mockPrisma as `prisma` with full PrismaClient type compatibility
export const prisma = mockPrisma as unknown as PrismaClient;
export { resetMockDatabase, getMockStore };
