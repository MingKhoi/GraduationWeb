import { Module } from '@nestjs/common';
import { GuestsController } from './guests.controller.js';
import { GuestsService } from './guests.service.js';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [GuestsController],
  providers: [GuestsService],
})
export class GuestsModule { }