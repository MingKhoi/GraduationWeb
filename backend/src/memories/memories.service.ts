import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMemoryDto } from './dto/create-memory.dto.js';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function hasValidImageSignature(mimeType: string, buffer: Buffer): boolean {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  }

  return (
    mimeType === 'image/webp' &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  );
}

@Injectable()
export class MemoriesService {
  private readonly uploadDirectory: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadDirectory = resolve(
      process.env.MEMORY_UPLOAD_DIR ?? 'uploads/memories',
    );
  }

  findAll() {
    return this.prisma.memoryPhoto.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        senderName: true,
        note: true,
        mimeType: true,
        createdAt: true,
      },
    });
  }

  async create(
    guestId: string,
    dto: CreateMemoryDto,
    file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh để treo lên bảng.');
    }

    const extension = MIME_EXTENSIONS[file.mimetype];
    if (!extension || !hasValidImageSignature(file.mimetype, file.buffer)) {
      throw new BadRequestException('Tệp tải lên không phải ảnh JPEG, PNG hoặc WebP hợp lệ.');
    }

    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
      select: {
        fullName: true,
        profile: { select: { nickname: true } },
      },
    });

    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    const fileName = `${randomUUID()}${extension}`;
    const filePath = resolve(this.uploadDirectory, fileName);
    await mkdir(this.uploadDirectory, { recursive: true });
    await writeFile(filePath, file.buffer, { flag: 'wx' });

    try {
      return await this.prisma.memoryPhoto.create({
        data: {
          fileName,
          mimeType: file.mimetype,
          senderName: guest.profile?.nickname.trim() || guest.fullName,
          note: dto.note || null,
          guestId,
        },
        select: {
          id: true,
          senderName: true,
          note: true,
          mimeType: true,
          createdAt: true,
        },
      });
    } catch (error) {
      await rm(filePath, { force: true });
      throw error;
    }
  }

  async getImage(id: string) {
    const photo = await this.prisma.memoryPhoto.findUnique({
      where: { id },
      select: { fileName: true, mimeType: true },
    });

    if (!photo) {
      throw new NotFoundException('Memory photo not found');
    }

    const extension = MIME_EXTENSIONS[photo.mimeType];
    const filePath = resolve(this.uploadDirectory, photo.fileName);
    if (
      !extension ||
      !photo.fileName.endsWith(extension) ||
      dirname(filePath) !== this.uploadDirectory
    ) {
      throw new NotFoundException('Memory photo file not found');
    }

    try {
      await access(filePath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new NotFoundException('Memory photo file not found');
      }
      throw error;
    }

    return {
      filePath,
      mimeType: photo.mimeType,
      extension,
    };
  }
}
