import {
    Body,
    Controller,
    Patch,
    Req,
    UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';
import { RsvpsService } from './rsvps.service.js';
import { UpdateRsvpDto } from './dto/update-rsvp.dto.js';
import { GuestAuthGuard } from '../auth/guards/guest-auth.guard.js';

interface AuthenticatedRequest extends Request {
    guestId: string;
}

@Controller('rsvps')
@UseGuards(GuestAuthGuard)
export class RsvpsController {
    constructor(
        private readonly rsvpsService: RsvpsService,
    ) { }

    @Patch('me')
    updateMyRsvp(
        @Req() request: AuthenticatedRequest,
        @Body() dto: UpdateRsvpDto,
    ) {
        return this.rsvpsService.updateByGuestId(
            request.guestId,
            dto,
        );
    }
}