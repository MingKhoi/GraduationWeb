import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface AuthenticatedAdminRequest extends Request {
  adminId: string;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedAdminRequest>();
    const token = request.cookies?.gw_admin_session as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Admin session not found');
    }

    const sessionTokenHash = createHash('sha256').update(token).digest('hex');
    const session = await this.prisma.adminSession.findUnique({
      where: { sessionTokenHash },
      select: { adminId: true, expiresAt: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid admin session');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.adminSession.deleteMany({
        where: { sessionTokenHash },
      });
      throw new UnauthorizedException('Admin session expired');
    }

    request.adminId = session.adminId;
    return true;
  }
}
