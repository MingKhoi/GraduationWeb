import { Test, TestingModule } from '@nestjs/testing';
import { RsvpsService } from './rsvps.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('RsvpsService', () => {
  let service: RsvpsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RsvpsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<RsvpsService>(RsvpsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
