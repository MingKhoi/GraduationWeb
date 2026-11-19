import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
