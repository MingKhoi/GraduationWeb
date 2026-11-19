import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { GuestsService } from './guests.service.js';

describe('GuestsService', () => {
  it('should be defined', async () => {
    const module = await Test.createTestingModule({
      providers: [
        GuestsService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    expect(module.get(GuestsService)).toBeDefined();
  });
});
