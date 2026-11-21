import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

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
export class ProfilesService {
    private readonly uploadDirectory: string;

    constructor(
        private readonly prisma: PrismaService,
    ) {
        this.uploadDirectory = resolve(
            process.env.AVATAR_UPLOAD_DIR ?? 'uploads/avatars',
        );
    }

    // Lấy hồ sơ khách mời
    async findByGuestId(guestId: string) {
        return this.prisma.guestProfile.findUnique({
            where: { guestId },
        });
    }

    // Cập nhật hoặc tạo hồ sơ khách mời
    async updateByGuestId(
        guestId: string,
        dto: UpdateProfileDto,
    ) {
        const profileData = {
            nickname: dto.nickname,
            ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        };

        return this.prisma.guestProfile.upsert({
            where: { guestId },

            create: {
                guestId,
                ...profileData,
            },

            update: profileData,
        });
    }

    async uploadAvatar(
        guestId: string,
        dto: UpdateProfileDto,
        file: Express.Multer.File | undefined,
    ) {
        if (!file) {
            throw new BadRequestException('Vui lòng chọn ảnh đại diện.');
        }

        const extension = MIME_EXTENSIONS[file.mimetype];
        if (!extension || !hasValidImageSignature(file.mimetype, file.buffer)) {
            throw new BadRequestException('Tệp tải lên không phải ảnh JPEG, PNG hoặc WebP hợp lệ.');
        }

        const fileName = `${randomUUID()}${extension}`;
        const filePath = resolve(this.uploadDirectory, fileName);
        const avatarUrl = `/profiles/${guestId}/avatar/${fileName}`;
        await mkdir(this.uploadDirectory, { recursive: true });
        await writeFile(filePath, file.buffer, { flag: 'wx' });

        try {
            return await this.prisma.guestProfile.upsert({
                where: { guestId },
                create: {
                    guestId,
                    nickname: dto.nickname,
                    avatarUrl,
                },
                update: {
                    nickname: dto.nickname,
                    avatarUrl,
                },
            });
        } catch (error) {
            await rm(filePath, { force: true });
            throw error;
        }
    }

    async getAvatar(guestId: string, fileName: string) {
        const extension = fileName.match(/\.([^.]+)$/)?.[0];
        const mimeType = Object.entries(MIME_EXTENSIONS)
            .find(([, allowedExtension]) => allowedExtension === extension)?.[0];
        const expectedAvatarUrl = `/profiles/${guestId}/avatar/${fileName}`;
        const profile = await this.prisma.guestProfile.findUnique({
            where: { guestId },
            select: { avatarUrl: true },
        });

        if (
            !mimeType ||
            !/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(fileName) ||
            profile?.avatarUrl !== expectedAvatarUrl
        ) {
            throw new NotFoundException('Avatar not found');
        }

        const filePath = resolve(this.uploadDirectory, fileName);
        if (dirname(filePath) !== this.uploadDirectory) {
            throw new NotFoundException('Avatar not found');
        }

        try {
            await access(filePath);
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                throw new NotFoundException('Avatar not found');
            }
            throw error;
        }

        return {
            filePath,
            mimeType,
        };
    }
}