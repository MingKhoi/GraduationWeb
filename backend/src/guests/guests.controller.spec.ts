import { Test } from '@nestjs/testing';
import { GuestsController } from './guests.controller.js';
import { GuestsService } from './guests.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('GuestsController', () => {
  it('should be defined', async () => {
    const module = await Test.createTestingModule({
      controllers: [GuestsController],
      providers: [
        { provide: GuestsService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    expect(module.get(GuestsController)).toBeDefined();
  });
});
