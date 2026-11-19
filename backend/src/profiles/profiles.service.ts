import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class ProfilesService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    // Lấy hồ sơ khách mời
    async findByGuestId(guestId: string) {
        return this.prisma.guestProfile.findUnique({
            where: { guestId },
        });
    }

    // Cập nhật hoặc tạo hồ sơ khách mời
    async updateByGuestId(
        guestId: string,
        dto: UpdateProfileDto,
    ) {
        return this.prisma.guestProfile.upsert({
            where: { guestId },

            create: {
                guestId,
                nickname: dto.nickname,
                avatarUrl: dto.avatarUrl,
            },

            update: {
                nickname: dto.nickname,
                avatarUrl: dto.avatarUrl,
            },
        });
    }
}