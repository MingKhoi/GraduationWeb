import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule { }