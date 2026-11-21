import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWishDto } from './dto/create-wish.dto.js';

@Injectable()
export class WishesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.wish.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        senderName: true,
        message: true,
        paperColor: true,
        createdAt: true,
      },
    });
  }

  async create(guestId: string, dto: CreateWishDto) {
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      select: {
        fullName: true,
        profile: { select: { nickname: true } },
      },
    });

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    return this.prisma.wish.create({
      data: {
        guestId,
        senderName: guest.profile?.nickname.trim() || guest.fullName,
        message: dto.message,
        paperColor: dto.paperColor,
      },
      select: {
        id: true,
        senderName: true,
        message: true,
        paperColor: true,
        createdAt: true,
      },
    });
  }
}
