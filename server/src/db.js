import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function pingDb() {
  await prisma.$queryRaw`SELECT 1`;
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
