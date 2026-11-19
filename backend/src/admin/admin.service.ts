import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [guests, invitations, attending, notAttending, pending] =
      await this.prisma.$transaction([
        this.prisma.guest.count(),
        this.prisma.invitation.count(),
        this.prisma.rSVP.count({ where: { status: 'ATTENDING' } }),
        this.prisma.rSVP.count({ where: { status: 'NOT_ATTENDING' } }),
        this.prisma.rSVP.count({ where: { status: 'PENDING' } }),
      ]);

    const activeInvitations = await this.prisma.invitation.count({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return {
      totalGuests: guests,
      attendingGuests: attending,
      notAttendingGuests: notAttending,
      pendingGuests: pending + (guests - attending - notAttending - pending),
      totalInvitations: invitations,
      activeInvitations,
      expiredInvitations: invitations - activeInvitations,
    };
  }
}
