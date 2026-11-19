import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateGuestDto } from './dto/create-guest.dto.js';
import { UpdateGuestDto } from './dto/update-guest.dto.js';

@Injectable()
export class GuestsService {
    constructor(private readonly prisma: PrismaService) { }

    // Tạo khách mời
    async create(createGuestDto: CreateGuestDto) {
        return this.prisma.guest.create({
            data: createGuestDto,
        });
    }

    // Lấy danh sách khách mời
    async findAll(search?: string) {
        return this.prisma.guest.findMany({
            where: search?.trim()
                ? {
                    OR: [
                        { fullName: { contains: search.trim(), mode: 'insensitive' } },
                        { email: { contains: search.trim(), mode: 'insensitive' } },
                    ],
                }
                : undefined,
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                rsvp: { select: { status: true } },
                invitation: {
                    select: {
                        id: true,
                        expiresAt: true,
                        createdAt: true,
                        message: true,
                    },
                },
            },
        });
    }

    // Tìm một khách mời theo ID
    async findOne(id: string) {
        const guest = await this.prisma.guest.findUnique({
            where: { id },
        });

        if (!guest) {
            throw new NotFoundException('Guest not found');
        }

        return guest;
    }

    // Cập nhật khách mời
    async update(id: string, updateGuestDto: UpdateGuestDto) {
        await this.findOne(id);

        return this.prisma.guest.update({
            where: { id },
            data: updateGuestDto,
        });
    }

    // Xóa khách mời
    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.guest.delete({
            where: { id },
        });
    }
}