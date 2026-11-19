import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

interface LoginAttempt {
  count: number;
  resetAt: number;
}

@Injectable()
export class AdminAuthService {
  private readonly attempts = new Map<string, LoginAttempt>();
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000;
  private readonly sessionMaxAgeMs = 12 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private checkRateLimit(key: string): void {
    const now = Date.now();
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }

    if (current.count >= this.maxAttempts) {
      throw new HttpException('Too many login attempts', HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count += 1;
  }

  async login(email: string, password: string, clientKey: string) {
    const normalizedEmail = email.trim().toLowerCase();
    this.checkRateLimit(`${clientKey}:${normalizedEmail}`);

    const admin = await this.prisma.admin.findUnique({
      where: { email: normalizedEmail },
    });

    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.attempts.delete(`${clientKey}:${normalizedEmail}`);

    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.sessionMaxAgeMs);

    await this.prisma.adminSession.create({
      data: {
        sessionTokenHash: this.hashToken(sessionToken),
        adminId: admin.id,
        expiresAt,
      },
    });

    return {
      sessionToken,
      expiresAt,
      admin: {
        id: admin.id,
        email: admin.email,
      },
    };
  }

  async getMe(adminId: string) {
    return this.prisma.admin.findUniqueOrThrow({
      where: { id: adminId },
      select: { id: true, email: true, createdAt: true },
    });
  }

  async logout(sessionToken: string) {
    const result = await this.prisma.adminSession.deleteMany({
      where: { sessionTokenHash: this.hashToken(sessionToken) },
    });
    return { deletedSessions: result.count };
  }

  getSessionMaxAgeMs(): number {
    return this.sessionMaxAgeMs;
  }
}
