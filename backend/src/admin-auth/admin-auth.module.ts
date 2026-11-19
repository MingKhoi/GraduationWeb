import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminAuthGuard } from './guards/admin-auth.guard.js';

@Module({
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminAuthGuard],
  exports: [AdminAuthGuard],
})
export class AdminAuthModule {}
