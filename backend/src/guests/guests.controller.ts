import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';

import { GuestsService } from './guests.service.js';
import { CreateGuestDto } from './dto/create-guest.dto.js';
import { UpdateGuestDto } from './dto/update-guest.dto.js';
import { UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard.js';

@Controller('guests')
@UseGuards(AdminAuthGuard)
export class GuestsController {
    constructor(private readonly guestsService: GuestsService) { }

    // POST /guests
    @Post()
    create(@Body() createGuestDto: CreateGuestDto) {
        return this.guestsService.create(createGuestDto);
    }

    // GET /guests
    @Get()
    findAll(@Query('search') search?: string) {
        return this.guestsService.findAll(search);
    }

    // GET /guests/:id
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.guestsService.findOne(id);
    }

    // PATCH /guests/:id
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateGuestDto: UpdateGuestDto,
    ) {
        return this.guestsService.update(id, updateGuestDto);
    }

    // DELETE /guests/:id
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.guestsService.remove(id);
    }
}