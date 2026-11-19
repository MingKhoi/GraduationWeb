import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';

import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService) { }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    // Đổi invitation token thành session
    async exchangeInvitation(token: string) {
        const invitation = await this.prisma.invitation.findUnique({
            where: {
                tokenHash: this.hashToken(token),
            },
            select: {
                guestId: true,
                expiresAt: true,
            },
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (
            invitation.expiresAt &&
            invitation.expiresAt.getTime() < Date.now()
        ) {
            throw new UnauthorizedException('Invitation has expired');
        }

        // Tạo session token mới
        const sessionToken = randomBytes(32).toString('hex');
        const sessionTokenHash = this.hashToken(sessionToken);

        // Session có thời hạn 7 ngày
        const expiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
        );

        await this.prisma.guestSession.create({
            data: {
                sessionTokenHash,
                guestId: invitation.guestId,
                expiresAt,
            },
        });

        const guest = await this.prisma.guest.findUnique({
            where: {
                id: invitation.guestId,
            },
            select: {
                id: true,
                fullName: true,
                profile: {
                    select: {
                        nickname: true,
                        avatarUrl: true,
                    },
                },
                rsvp: {
                    select: {
                        status: true,
                    },
                },
                invitation: {
                    select: {
                        message: true,
                    },
                },
            },
        });

        if (!guest) {
            throw new NotFoundException('Guest not found');
        }

        return {
            sessionToken,
            guest,
        };
    }

    // Lấy thông tin khách đang đăng nhập
    async getMe(guestId: string) {
        const guest = await this.prisma.guest.findUnique({
            where: {
                id: guestId,
            },
            select: {
                id: true,
                fullName: true,
                profile: {
                    select: {
                        nickname: true,
                        avatarUrl: true,
                    },
                },
                rsvp: {
                    select: {
                        status: true,
                    },
                },
                invitation: {
                    select: {
                        message: true,
                    },
                },
            },
        });

        if (!guest) {
            throw new NotFoundException('Guest not found');
        }

        return guest;
    }

    // Thu hồi session
    async logout(sessionToken: string) {
        const sessionTokenHash = this.hashToken(sessionToken);

        const result = await this.prisma.guestSession.deleteMany({
            where: {
                sessionTokenHash,
            },
        });

        return {
            message: 'Logged out successfully',
            deletedSessions: result.count,
        };
    }
}