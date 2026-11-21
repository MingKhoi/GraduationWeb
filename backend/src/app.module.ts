import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { GuestsModule } from './guests/guests.module.js';
import { InvitationsModule } from './invitations/invitations.module.js';
import { RsvpsModule } from './rsvps/rsvps.module.js';
import { ProfilesModule } from './profiles/profiles.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AdminAuthModule } from './admin-auth/admin-auth.module.js';
import { AdminModule } from './admin/admin.module.js';
import { WorldSettingsModule } from './world-settings/world-settings.module.js';
import { LobbyModule } from './lobby/lobby.module.js';
import { WishesModule } from './wishes/wishes.module.js';
import { MemoriesModule } from './memories/memories.module.js';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    GuestsModule,
    InvitationsModule,
    RsvpsModule,
    ProfilesModule,
    AuthModule,
    AdminAuthModule,
    AdminModule,
    WorldSettingsModule,
    LobbyModule,
    WishesModule,
    MemoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})


export class AppModule { }