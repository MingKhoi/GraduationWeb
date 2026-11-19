import { Test, TestingModule } from '@nestjs/testing';
import { RsvpsController } from './rsvps.controller.js';
import { RsvpsService } from './rsvps.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('RsvpsController', () => {
  let controller: RsvpsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RsvpsController],
      providers: [
        { provide: RsvpsService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<RsvpsController>(RsvpsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
