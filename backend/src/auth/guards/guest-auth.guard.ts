
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';

interface AuthenticatedRequest extends Request {
    guestId?: string;
    guestSessionId?: string;
}

@Injectable()
export class GuestAuthGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) { }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();

        const sessionToken = request.cookies?.gw_session;

        if (!sessionToken) {
            throw new UnauthorizedException('Session not found');
        }

        const session = await this.prisma.guestSession.findUnique({
            where: {
                sessionTokenHash: this.hashToken(sessionToken),
            },
            select: {
                id: true,
                guestId: true,
                expiresAt: true,
            },
        });

        if (!session) {
            throw new UnauthorizedException('Invalid session');
        }

        if (session.expiresAt.getTime() < Date.now()) {
            await this.prisma.guestSession.deleteMany({
                where: {
                    sessionTokenHash: this.hashToken(sessionToken),
                },
            });

            throw new UnauthorizedException('Session expired');
        }

        request.guestId = session.guestId;
        request.guestSessionId = session.id;

        return true;
    }
}
