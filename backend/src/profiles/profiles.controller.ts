import {
    BadRequestException,
    Controller,
    Get,
    Patch,
    Post,
    Body,
    Header,
    Req,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Param,
    StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { createReadStream } from 'node:fs';
import { ProfilesService } from './profiles.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { GuestAuthGuard } from '../auth/guards/guest-auth.guard.js';

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

interface AuthenticatedRequest extends Request {
    guestId: string;
}

@Controller('profiles')
export class ProfilesController {
    constructor(
        private readonly profilesService: ProfilesService,
    ) { }

    @Get('me')
    @UseGuards(GuestAuthGuard)
    findMyProfile(@Req() request: AuthenticatedRequest) {
        return this.profilesService.findByGuestId(request.guestId);
    }

    @Patch('me')
    @UseGuards(GuestAuthGuard)
    updateMyProfile(
        @Req() request: AuthenticatedRequest,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.profilesService.updateByGuestId(
            request.guestId,
            dto,
        );
    }

    @Post('me/avatar')
    @UseGuards(GuestAuthGuard)
    @UseInterceptors(
        FileInterceptor('avatar', {
            limits: { fileSize: 5 * 1024 * 1024 },
            fileFilter: (_request, file, callback) => {
                if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
                    callback(
                        new BadRequestException('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.'),
                        false,
                    );
                    return;
                }
                callback(null, true);
            },
        }),
    )
    uploadAvatar(
        @Req() request: AuthenticatedRequest,
        @Body() dto: UpdateProfileDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.profilesService.uploadAvatar(request.guestId, dto, file);
    }

    @Get(':guestId/avatar/:fileName')
    @Header('Cache-Control', 'public, max-age=31536000, immutable')
    async getAvatar(
        @Param('guestId') guestId: string,
        @Param('fileName') fileName: string,
    ) {
        const image = await this.profilesService.getAvatar(guestId, fileName);
        return new StreamableFile(createReadStream(image.filePath), {
            type: image.mimeType,
            disposition: `inline; filename="${fileName}"`,
        });
    }
}