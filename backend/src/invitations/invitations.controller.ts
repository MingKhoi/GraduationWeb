import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';

import { InvitationsService } from './invitations.service.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { Delete, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard.js';

@Controller('invitations')
export class InvitationsController {
    constructor(
        private readonly invitationsService: InvitationsService,
    ) { }

    @Post()
    @UseGuards(AdminAuthGuard)
    create(@Body() dto: CreateInvitationDto) {
        return this.invitationsService.create(dto);
    }

    @Get(':token')
    findByToken(@Param('token') token: string) {
        return this.invitationsService.findByToken(token);
    }

    @Patch('reissue/:guestId')
    @UseGuards(AdminAuthGuard)
    reissue(@Param('guestId') guestId: string) {
        return this.invitationsService.reissue(guestId);
    }

    @Delete('revoke/:guestId')
    @UseGuards(AdminAuthGuard)
    revoke(@Param('guestId') guestId: string) {
        return this.invitationsService.revoke(guestId);
    }
}