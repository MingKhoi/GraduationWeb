import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('InvitationsController', () => {
  let controller: InvitationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        { provide: InvitationsService, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<InvitationsController>(InvitationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
