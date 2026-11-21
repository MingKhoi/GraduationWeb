import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfilesService } from './profiles.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ProfilesService', () => {
  let service: ProfilesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfilesService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('stores the uploaded avatar and returns a URL that can be served', async () => {
    const uploadDirectory = await mkdtemp(join(tmpdir(), 'graduation-avatar-test-'));
    vi.stubEnv('AVATAR_UPLOAD_DIR', uploadDirectory);
    let avatarUrl: string | null = null;
    const prisma = {
      guestProfile: {
        upsert: vi.fn().mockImplementation(({ create }) => {
          avatarUrl = create.avatarUrl;
          return Promise.resolve(create);
        }),
        findUnique: vi.fn().mockImplementation(() => Promise.resolve({ avatarUrl })),
      },
    };
    const avatarService = new ProfilesService(prisma as unknown as PrismaService);
    const file = {
      mimetype: 'image/png',
      buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
    } as Express.Multer.File;

    try {
      const profile = await avatarService.uploadAvatar(
        'guest-1',
        { nickname: 'An' },
        file,
      );
      expect(profile.avatarUrl).toMatch(/^\/profiles\/guest-1\/avatar\/.+\.png$/);

      const fileName = profile.avatarUrl?.split('/').pop();
      expect(fileName).toBeTruthy();
      await expect(avatarService.getAvatar('guest-1', fileName!)).resolves.toMatchObject({
        mimeType: 'image/png',
      });
      await expect(readdir(uploadDirectory)).resolves.toHaveLength(1);
    } finally {
      vi.unstubAllEnvs();
      await rm(uploadDirectory, { recursive: true, force: true });
    }
  });

  it('rejects invalid avatar image content', async () => {
    await expect(
      service.uploadAvatar(
        'guest-1',
        { nickname: 'An' },
        {
          mimetype: 'image/png',
          buffer: Buffer.from('not an image'),
        } as Express.Multer.File,
      ),
    ).rejects.toThrow('Tệp tải lên không phải ảnh JPEG, PNG hoặc WebP hợp lệ.');
  });
});
