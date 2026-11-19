import { Module } from '@nestjs/common';
import { RsvpsController } from './rsvps.controller.js';
import { RsvpsService } from './rsvps.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [RsvpsController],
  providers: [RsvpsService],
})
export class RsvpsModule { }