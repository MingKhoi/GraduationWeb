import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

async function bootstrapAdmin() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD before running the bootstrap.',
    );
  }

  if (password.length < 12) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD must contain at least 12 characters.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    await prisma.$connect();
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.upsert({
      where: { email },
      create: { email, passwordHash },
      update: { passwordHash },
      select: { id: true, email: true },
    });

    console.log(`Admin bootstrap complete for ${admin.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapAdmin().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Admin bootstrap failed';
  console.error(message);
  process.exitCode = 1;
});
