import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    invitation: { findUnique: ReturnType<typeof vi.fn> };
    guestSession: { create: ReturnType<typeof vi.fn> };
    guest: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    prisma = {
      invitation: {
        findUnique: vi.fn().mockResolvedValue({
          guestId: 'guest-1',
          expiresAt: null,
        }),
      },
      guestSession: {
        create: vi.fn().mockResolvedValue({}),
      },
      guest: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'guest-1',
          fullName: 'Nguyễn An',
          profile: null,
          rsvp: null,
          invitation: { message: 'Hẹn gặp bạn tại lễ tốt nghiệp nhé!' },
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('includes the invitation message when exchanging an invitation token', async () => {
    const result = await service.exchangeInvitation('token');

    expect(result.guest.invitation?.message).toBe('Hẹn gặp bạn tại lễ tốt nghiệp nhé!');
    expect(prisma.guest.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          invitation: { select: { message: true } },
        }),
      }),
    );
  });

  it('includes the invitation message when loading the current guest', async () => {
    const result = await service.getMe('guest-1');

    expect(result.invitation?.message).toBe('Hẹn gặp bạn tại lễ tốt nghiệp nhé!');
    expect(prisma.guest.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          invitation: { select: { message: true } },
        }),
      }),
    );
  });
});
