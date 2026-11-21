import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WishesController } from './wishes.controller.js';
import { WishesService } from './wishes.service.js';

@Module({
  imports: [AuthModule],
  controllers: [WishesController],
  providers: [WishesService],
})
export class WishesModule {}
