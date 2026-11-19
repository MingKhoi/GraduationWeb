import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesController } from './profiles.controller.js';
import { ProfilesService } from './profiles.service.js';
import { GuestAuthGuard } from '../auth/guards/guest-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ProfilesController', () => {
  let controller: ProfilesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        { provide: ProfilesService, useValue: {} },
        { provide: GuestAuthGuard, useValue: { canActivate: () => true } },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
