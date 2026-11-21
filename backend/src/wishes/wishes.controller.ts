import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { GuestAuthGuard } from '../auth/guards/guest-auth.guard.js';
import { CreateWishDto } from './dto/create-wish.dto.js';
import { WishesService } from './wishes.service.js';

interface AuthenticatedRequest extends Request {
  guestId: string;
}

@Controller('wishes')
@UseGuards(GuestAuthGuard)
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  @Get()
  findAll() {
    return this.wishesService.findAll();
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateWishDto,
  ) {
    return this.wishesService.create(request.guestId, dto);
  }
}
