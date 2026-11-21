import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWishDto } from './dto/create-wish.dto.js';
import { WishesService } from './wishes.service.js';

describe('WishesService', () => {
  it('stores the authenticated guest name with the trimmed wish', async () => {
    const createdWish = {
      id: 'wish-1',
      senderName: 'Lan',
      message: 'Chúc mừng bạn!',
      paperColor: 'pink',
      createdAt: new Date(),
    };
    const prisma = {
      guest: {
        findUnique: vi.fn().mockResolvedValue({
          fullName: 'Lan Nguyen',
          profile: { nickname: ' Lan ' },
        }),
      },
      wish: {
        create: vi.fn().mockResolvedValue(createdWish),
      },
    };
    const service = new WishesService(prisma as unknown as PrismaService);
    const dto: CreateWishDto = {
      message: 'Chúc mừng bạn!',
      paperColor: 'pink',
    };

    await expect(service.create('guest-1', dto)).resolves.toEqual(createdWish);
    expect(prisma.wish.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          guestId: 'guest-1',
          senderName: 'Lan',
          message: 'Chúc mừng bạn!',
          paperColor: 'pink',
        },
      }),
    );
  });

  it('returns wishes newest first', async () => {
    const wishes = [{ id: 'wish-1' }];
    const prisma = {
      wish: { findMany: vi.fn().mockResolvedValue(wishes) },
    };
    const service = new WishesService(prisma as unknown as PrismaService);

    await expect(service.findAll()).resolves.toEqual(wishes);
    expect(prisma.wish.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });
});
