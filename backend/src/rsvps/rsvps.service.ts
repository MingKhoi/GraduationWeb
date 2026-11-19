import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateRsvpDto } from './dto/update-rsvp.dto.js';

@Injectable()
export class RsvpsService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async updateByGuestId(
        guestId: string,
        dto: UpdateRsvpDto,
    ) {
        return this.prisma.rSVP.upsert({
            where: {
                guestId,
            },

            create: {
                guestId,
                status: dto.status,
            },

            update: {
                status: dto.status,
            },
        });
    }
}