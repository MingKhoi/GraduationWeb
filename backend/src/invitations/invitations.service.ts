import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';

import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';

@Injectable()
export class InvitationsService {
    constructor(private readonly prisma: PrismaService) { }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    // Tạo thiệp mời
    async create(dto: CreateInvitationDto) {
        const guest = await this.prisma.guest.findUnique({
            where: { id: dto.guestId },
        });

        if (!guest) {
            throw new NotFoundException('Guest not found');
        }

        const existingInvitation = await this.prisma.invitation.findUnique({
            where: { guestId: dto.guestId },
        });

        if (existingInvitation) {
            throw new ConflictException(
                'This guest already has an invitation',
            );
        }

        const token = randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(token);

        await this.prisma.invitation.create({
            data: {
                tokenHash,
                message: dto.message,
                guestId: dto.guestId,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            },
        });

        const frontendUrl =
            process.env.FRONTEND_URL ?? 'http://localhost:5173';

        return {
            message: 'Invitation created successfully',
            invitationUrl: `${frontendUrl}/invite/${token}`,
        };
    }

    // Lấy thông tin thiệp bằng token
    async findByToken(token: string) {
        const tokenHash = this.hashToken(token);

        const invitation = await this.prisma.invitation.findUnique({
            where: { tokenHash },
            select: {
                message: true,
                expiresAt: true,
                guest: {
                    select: {
                        id: true,
                        fullName: true,
                        rsvp: {
                            select: {
                                status: true,
                            },
                        },
                    },
                },
            },
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (
            invitation.expiresAt &&
            invitation.expiresAt.getTime() < Date.now()
        ) {
            throw new NotFoundException('Invitation has expired');
        }

        return {
            guest: invitation.guest,
            message: invitation.message,
        };
    }
    // Cấp lại token cho thiệp mời hiện tại
    async reissue(guestId: string) {
        const existingInvitation = await this.prisma.invitation.findUnique({
            where: { guestId },
        });

        if (!existingInvitation) {
            throw new NotFoundException('Invitation not found');
        }

        // Tạo token mới
        const token = randomBytes(32).toString('hex');
        const tokenHash = this.hashToken(token);

        // Thay tokenHash cũ bằng tokenHash mới
        await this.prisma.invitation.update({
            where: { guestId },
            data: {
                tokenHash,
            },
        });

        const frontendUrl =
            process.env.FRONTEND_URL ?? 'http://localhost:5173';

        return {
            message: 'Invitation reissued successfully',
            invitationUrl: `${frontendUrl}/invite/${token}`,
        };
    }

    async revoke(guestId: string) {
        const existingInvitation = await this.prisma.invitation.findUnique({
            where: { guestId },
        });

        if (!existingInvitation) {
            throw new NotFoundException('Invitation not found');
        }

        await this.prisma.invitation.delete({
            where: { guestId },
        });

        await this.prisma.guestSession.deleteMany({
            where: { guestId },
        });

        return { message: 'Invitation revoked successfully' };
    }

}