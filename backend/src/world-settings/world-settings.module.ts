import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { WorldSettingsController } from './world-settings.controller.js';
import { WorldSettingsService } from './world-settings.service.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [WorldSettingsController],
  providers: [WorldSettingsService],
})
export class WorldSettingsModule {}
