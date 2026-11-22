import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LobbyGateway } from './lobby.gateway.js';

@Module({
  imports: [AuthModule],
  providers: [LobbyGateway],
})
export class LobbyModule { }