import { Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway.js';

@Module({
  providers: [LobbyGateway],
})
export class LobbyModule {}
