import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { createReadStream } from 'node:fs';
import { GuestAuthGuard } from '../auth/guards/guest-auth.guard.js';
import { CreateMemoryDto } from './dto/create-memory.dto.js';
import { MemoriesService } from './memories.service.js';

interface AuthenticatedRequest extends Request {
  guestId: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Controller('memories')
@UseGuards(GuestAuthGuard)
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Get()
  findAll() {
    return this.memoriesService.findAll();
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 12 * 1024 * 1024 },
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
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateMemoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.memoriesService.create(request.guestId, dto, file);
  }

  @Get(':id/image')
  @Header('Cache-Control', 'private, no-store')
  async getImage(@Param('id') id: string) {
    const image = await this.memoriesService.getImage(id);
    return new StreamableFile(createReadStream(image.filePath), {
      type: image.mimeType,
      disposition: `inline; filename="graduation-memory-${id}${image.extension}"`,
    });
  }

  @Get(':id/download')
  @Header('Cache-Control', 'private, no-store')
  async download(@Param('id') id: string) {
    const image = await this.memoriesService.getImage(id);
    return new StreamableFile(createReadStream(image.filePath), {
      type: image.mimeType,
      disposition: `attachment; filename="graduation-memory-${id}${image.extension}"`,
    });
  }
}
