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
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { AdminAuthService } from './admin-auth.service.js';
import {
  AdminAuthGuard,
  type AuthenticatedAdminRequest,
} from './guards/admin-auth.guard.js';

const ADMIN_COOKIE = 'gw_admin_session';

@Controller('admin-auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  async login(
    @Body() dto: AdminLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.adminAuthService.login(
      dto.email,
      dto.password,
      request.ip ?? 'unknown',
    );

    const secure = process.env.NODE_ENV === 'production';
    response.cookie(ADMIN_COOKIE, result.sessionToken, {
      httpOnly: true,
      secure,
      sameSite: secure ? 'none' : 'lax',
      path: '/',
      maxAge: this.adminAuthService.getSessionMaxAgeMs(),
    });

    return { message: 'Admin authenticated', admin: result.admin };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.[ADMIN_COOKIE] as string | undefined;
    const result = token
      ? await this.adminAuthService.logout(token)
      : { deletedSessions: 0 };

    response.clearCookie(ADMIN_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    return { message: 'Admin logged out', deletedSessions: result.deletedSessions };
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  getMe(@Req() request: AuthenticatedAdminRequest) {
    return this.adminAuthService.getMe(request.adminId);
  }
}
