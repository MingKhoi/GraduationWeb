import { Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service.js';

const LOBBY_SIZE = 16;
const MAX_CHAT_LENGTH = 280;
const CHAT_COOLDOWN_MS = 800;
const REACTION_COOLDOWN_MS = 800;

const REACTIONS = {
  heart: 'tim nè em iu',
  can: 'có cái lon nè',
  poop: 'tặng bạn bọc cớt',
} as const;

type ReactionId = keyof typeof REACTIONS;

interface Participant {
  guestId: string;
  seatId: number;
  name: string;
  avatarUrl: string | null;
  lastChatAt: number;
  lastReactionAt: number;
}

interface LobbyMessage {
  id: string;
  seatId: number;
  name: string;
  text: string;
  sentAt: number;
}

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

@WebSocketGateway({
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(LobbyGateway.name);
  private readonly participants = new Map<string, Participant>();
  private readonly messages: LobbyMessage[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) { }


  async handleConnection(socket: Socket): Promise<void> {
    const ticket = socket.handshake.auth?.ticket;

    if (typeof ticket !== 'string') {
      socket.emit('lobby:error', {
        message: 'Vui lòng đăng nhập để vào sảnh.',
      });
      socket.disconnect(true);
      return;
    }

    const ticketData = this.authService.verifyLobbyTicket(ticket);

    if (!ticketData) {
      socket.emit('lobby:error', {
        message: 'Vé đăng nhập không hợp lệ hoặc đã hết hạn.',
      });
      socket.disconnect(true);
      return;
    }

    try {
      const session = await this.prisma.guestSession.findFirst({
        where: {
          id: ticketData.sessionId,
          guestId: ticketData.guestId,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          guestId: true,
          guest: {
            select: {
              fullName: true,
              profile: {
                select: {
                  nickname: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      if (!socket.connected) {
        return;
      }

      if (!session) {
        socket.emit('lobby:error', {
          message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
        });
        socket.disconnect(true);
        return;
      }


      if (
        [...this.participants.values()].some(
          (participant) => participant.guestId === session.guestId,
        )
      ) {
        socket.emit('lobby:error', { message: 'Tài khoản này đang mở sảnh ở một kết nối khác.' });
        socket.disconnect(true);
        return;
      }

      const occupiedSeats = new Set(
        [...this.participants.values()].map((participant) => participant.seatId),
      );
      const seatId = Array.from({ length: LOBBY_SIZE }, (_, index) => index).find(
        (index) => !occupiedSeats.has(index),
      );

      if (seatId === undefined) {
        socket.emit('lobby:error', { message: 'Sảnh đã đủ 16 khách mời.' });
        socket.disconnect(true);
        return;
      }

      const participant: Participant = {
        guestId: session.guestId,
        seatId,
        name: session.guest.profile?.nickname.trim() || session.guest.fullName,
        avatarUrl: session.guest.profile?.avatarUrl ?? null,
        lastChatAt: 0,
        lastReactionAt: 0,
      };

      this.participants.set(socket.id, participant);
      await socket.join('lobby');
      socket.emit('lobby:welcome', { seatId });
      socket.emit('lobby:state', this.getLobbyState());
      this.server.to('lobby').emit('lobby:state', this.getLobbyState());
    } catch (error) {
      this.logger.error('Failed to authenticate lobby connection', error);
      socket.emit('lobby:error', { message: 'Không thể kết nối sảnh lúc này. Vui lòng thử lại.' });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    if (!this.participants.delete(socket.id)) {
      return;
    }

    this.server.to('lobby').emit('lobby:state', this.getLobbyState());
  }

  @SubscribeMessage('lobby:chat')
  handleChat(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: unknown,
  ): void {
    const participant = this.participants.get(socket.id);
    const text =
      typeof payload === 'object' &&
        payload !== null &&
        'text' in payload &&
        typeof payload.text === 'string'
        ? payload.text.trim()
        : '';

    if (!participant || !text || text.length > MAX_CHAT_LENGTH) {
      socket.emit('lobby:error', {
        message: `Tin nhắn cần có từ 1 đến ${MAX_CHAT_LENGTH} ký tự.`,
      });
      return;
    }

    const now = Date.now();
    if (now - participant.lastChatAt < CHAT_COOLDOWN_MS) {
      socket.emit('lobby:error', { message: 'Bạn gửi tin nhắn hơi nhanh, thử lại nhé.' });
      return;
    }
    participant.lastChatAt = now;

    const message: LobbyMessage = {
      id: randomUUID(),
      seatId: participant.seatId,
      name: participant.name,
      text,
      sentAt: now,
    };

    this.messages.push(message);
    if (this.messages.length > 50) {
      this.messages.shift();
    }

    this.server.to('lobby').emit('lobby:message', message);
  }

  @SubscribeMessage('lobby:reaction')
  handleReaction(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: unknown,
  ): void {
    const participant = this.participants.get(socket.id);
    const reactionId =
      typeof payload === 'object' &&
        payload !== null &&
        'reactionId' in payload &&
        typeof payload.reactionId === 'string' &&
        Object.hasOwn(REACTIONS, payload.reactionId)
        ? (payload.reactionId as ReactionId)
        : null;
    const targetSeatId =
      typeof payload === 'object' &&
        payload !== null &&
        'targetSeatId' in payload &&
        typeof payload.targetSeatId === 'number'
        ? payload.targetSeatId
        : -1;
    const target = [...this.participants.values()].find(
      (candidate) => candidate.seatId === targetSeatId,
    );

    if (
      !participant ||
      !reactionId ||
      !target ||
      target.seatId === participant.seatId
    ) {
      socket.emit('lobby:error', { message: 'Hãy chọn một khách mời và icon hợp lệ.' });
      return;
    }

    const now = Date.now();
    if (now - participant.lastReactionAt < REACTION_COOLDOWN_MS) {
      socket.emit('lobby:error', { message: 'Bạn gửi icon hơi nhanh, thử lại nhé.' });
      return;
    }
    participant.lastReactionAt = now;

    this.server.to('lobby').emit('lobby:reaction', {
      id: randomUUID(),
      fromSeatId: participant.seatId,
      toSeatId: target.seatId,
      reactionId,
      message: REACTIONS[reactionId],
    });
  }

  private getLobbyState() {
    const seats = Array.from({ length: LOBBY_SIZE }, (_, seatId) => {
      const participant = [...this.participants.values()].find(
        (candidate) => candidate.seatId === seatId,
      );

      return participant
        ? {
          seatId,
          name: participant.name,
          avatarUrl: participant.avatarUrl,
        }
        : { seatId, name: null, avatarUrl: null };
    });

    return {
      seats,
      messages: this.messages.slice(-30),
    };
  }

  // private getSessionToken(socket: Socket): string | null {
  //   const cookieHeader = socket.handshake.headers.cookie;
  //   if (!cookieHeader) {
  //     return null;
  //   }

  //   const cookie = cookieHeader
  //     .split(';')
  //     .map((part) => part.trim())
  //     .find((part) => part.startsWith('gw_session='));

  //   return cookie?.slice('gw_session='.length) || null;
  // }

  // private hashToken(token: string): string {
  //   return createHash('sha256').update(token).digest('hex');
  // }
}
