import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';

import {
    randomBytes,
    createHash,
    createHmac,
    timingSafeEqual,
} from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService) { }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private getLobbyTicketSecret(): string {
        const secret = process.env.LOBBY_TICKET_SECRET;

        if (!secret || secret.length < 32) {
            throw new Error('LOBBY_TICKET_SECRET is not configured correctly');
        }

        return secret;
    }

    createLobbyTicket(guestId: string, sessionId: string): string {
        const payload = Buffer.from(
            JSON.stringify({
                guestId,
                sessionId,
                exp: Date.now() + 60_000,
            }),
        ).toString('base64url');

        const signature = createHmac(
            'sha256',
            this.getLobbyTicketSecret(),
        )
            .update(payload)
            .digest('base64url');

        return `${payload}.${signature}`;
    }

    verifyLobbyTicket(
        ticket: string,
    ): { guestId: string; sessionId: string } | null {
        try {
            const parts = ticket.split('.');

            if (parts.length !== 2) {
                return null;
            }

            const [payload, signature] = parts;

            const expectedSignature = createHmac(
                'sha256',
                this.getLobbyTicketSecret(),
            )
                .update(payload)
                .digest();

            const actualSignature = Buffer.from(
                signature,
                'base64url',
            );

            if (
                actualSignature.length !== expectedSignature.length ||
                !timingSafeEqual(actualSignature, expectedSignature)
            ) {
                return null;
            }

            const data = JSON.parse(
                Buffer.from(payload, 'base64url').toString('utf8'),
            );

            if (
                typeof data.guestId !== 'string' ||
                typeof data.sessionId !== 'string' ||
                typeof data.exp !== 'number' ||
                data.exp <= Date.now()
            ) {
                return null;
            }

            return {
                guestId: data.guestId,
                sessionId: data.sessionId,
            };
        } catch {
            return null;
        }
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