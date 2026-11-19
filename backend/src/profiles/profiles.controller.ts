import {
    Controller,
    Get,
    Patch,
    Body,
    Req,
    UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';
import { ProfilesService } from './profiles.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { GuestAuthGuard } from '../auth/guards/guest-auth.guard.js';

interface AuthenticatedRequest extends Request {
    guestId: string;
}

@Controller('profiles')
@UseGuards(GuestAuthGuard)
export class ProfilesController {
    constructor(
        private readonly profilesService: ProfilesService,
    ) { }

    @Get('me')
    findMyProfile(@Req() request: AuthenticatedRequest) {
        return this.profilesService.findByGuestId(request.guestId);
    }

    @Patch('me')
    updateMyProfile(
        @Req() request: AuthenticatedRequest,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.profilesService.updateByGuestId(
            request.guestId,
            dto,
        );
    }
}