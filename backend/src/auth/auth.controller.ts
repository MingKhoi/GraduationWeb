import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { AuthService } from './auth.service.js';
import { ExchangeInvitationDto } from './dto/exchange-invitation.dto.js';
import { GuestAuthGuard } from './guards/guest-auth.guard.js';

const SESSION_COOKIE = 'gw_session';

const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    path: '/',
};

interface AuthenticatedRequest extends Request {
    guestId?: string;
    guestSessionId?: string;
}

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // Đổi invitation token lấy session cookie
    @Post('exchange')
    async exchange(
        @Body() dto: ExchangeInvitationDto,
        @Res({ passthrough: true }) response: Response,
    ) {
        const result = await this.authService.exchangeInvitation(dto.token);

        response.cookie(
            SESSION_COOKIE,
            result.sessionToken,
            {
                ...cookieOptions,
                maxAge: SESSION_MAX_AGE,
            },
        );

        return {
            message: 'Authentication successful',
            guest: result.guest,
        };
    }

    // Lấy thông tin khách đang đăng nhập
    @Get('me')
    @UseGuards(GuestAuthGuard)
    async getMe(@Req() request: AuthenticatedRequest) {

        return this.authService.getMe(request.guestId!);
    }
    @Post('lobby-ticket')
    @UseGuards(GuestAuthGuard)
    createLobbyTicket(@Req() request: AuthenticatedRequest) {
        return {
            ticket: this.authService.createLobbyTicket(
                request.guestId!,
                request.guestSessionId!,
            ),
        };
    }

    // Đăng xuất
    @Post('logout')
    async logout(
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ) {
        const sessionToken = request.cookies?.[SESSION_COOKIE];

        let deletedSessions = 0;

        if (sessionToken) {
            const result = await this.authService.logout(sessionToken);
            deletedSessions = result.deletedSessions;
        }

        response.clearCookie(SESSION_COOKIE, cookieOptions);

        return {
            message: 'Logged out successfully',
            deletedSessions,
        };
    }
}