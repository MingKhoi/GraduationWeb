import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateWorldSettingsDto } from './dto/update-world-settings.dto.js';

@Injectable()
export class WorldSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  getPublic() {
    return this.prisma.worldSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  getAdmin() {
    return this.getPublic();
  }

  update(dto: UpdateWorldSettingsDto) {
    return this.prisma.worldSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        eventTitle: dto.eventTitle,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        eventDescription: dto.eventDescription,
        welcomeMessage: dto.welcomeMessage,
        worldName: dto.worldName,
        musicUrl: dto.musicUrl,
        environment: dto.environment,
        announcement: dto.announcement,
      },
      update: {
        eventTitle: dto.eventTitle,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        eventDescription: dto.eventDescription,
        welcomeMessage: dto.welcomeMessage,
        worldName: dto.worldName,
        musicUrl: dto.musicUrl,
        environment: dto.environment,
        announcement: dto.announcement,
      },
    });
  }
}
