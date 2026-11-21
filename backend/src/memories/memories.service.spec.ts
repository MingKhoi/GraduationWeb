import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMemoryDto } from './dto/create-memory.dto.js';
import { MemoriesService } from './memories.service.js';

describe('MemoriesService', () => {
  it('stores uploaded image with the authenticated guest name and note', async () => {
    const uploadDirectory = await mkdtemp(join(tmpdir(), 'graduation-memory-test-'));
    vi.stubEnv('MEMORY_UPLOAD_DIR', uploadDirectory);
    const memory = {
      id: 'memory-1',
      senderName: 'An',
      note: 'Ngày tốt nghiệp',
      mimeType: 'image/png',
      createdAt: new Date(),
    };
    const prisma = {
      guest: {
        findUnique: vi.fn().mockResolvedValue({
          fullName: 'An Nguyen',
          profile: { nickname: ' An ' },
        }),
      },
      memoryPhoto: {
        create: vi.fn().mockResolvedValue(memory),
      },
    };
    const service = new MemoriesService(prisma as unknown as PrismaService);
    const file = {
      mimetype: 'image/png',
      buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
    } as Express.Multer.File;
    const dto: CreateMemoryDto = { note: 'Ngày tốt nghiệp' };

    try {
      await expect(service.create('guest-1', dto, file)).resolves.toEqual(memory);
      expect(prisma.memoryPhoto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            senderName: 'An',
            note: 'Ngày tốt nghiệp',
            guestId: 'guest-1',
            mimeType: 'image/png',
          }),
        }),
      );
      const savedFiles = await readdir(uploadDirectory);
      expect(savedFiles).toHaveLength(1);
    } finally {
      vi.unstubAllEnvs();
      await rm(uploadDirectory, { recursive: true, force: true });
    }
  });

  it('rejects invalid image content', async () => {
    const service = new MemoriesService({} as PrismaService);

    await expect(
      service.create(
        'guest-1',
        {},
        { mimetype: 'image/png', buffer: Buffer.from('not an image') } as Express.Multer.File,
      ),
    ).rejects.toThrow('Tệp tải lên không phải ảnh JPEG, PNG hoặc WebP hợp lệ.');
  });
});
