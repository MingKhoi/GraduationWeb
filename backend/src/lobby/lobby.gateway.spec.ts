import { createHash } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service.js';
import { LobbyGateway } from './lobby.gateway.js';

interface SessionRecord {
  guestId: string;
  expiresAt: Date;
  guest: {
    fullName: string;
    profile: { nickname: string; avatarUrl: string | null };
  };
}

interface MockSocket {
  socket: Socket;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  join: ReturnType<typeof vi.fn>;
}

function createSocket(id: string, token?: string): MockSocket {
  const emit = vi.fn();
  const disconnect = vi.fn();
  const join = vi.fn().mockResolvedValue(undefined);
  const socket = {
    id,
    connected: true,
    handshake: { headers: { cookie: token ? `gw_session=${token}` : undefined } },
    emit,
    disconnect,
    join,
  } as unknown as Socket;

  return { socket, emit, disconnect, join };
}

describe('LobbyGateway', () => {
  it('authenticates guests and broadcasts chat and approved reactions', async () => {
    const sessions = new Map<string, SessionRecord>();
    const findUnique = vi.fn(
      async ({ where }: { where: { sessionTokenHash: string } }) =>
        sessions.get(where.sessionTokenHash) ?? null,
    );
    const prisma = {
      guestSession: { findUnique },
    } as unknown as PrismaService;
    const broadcast = vi.fn();
    const server = {
      to: vi.fn(() => ({ emit: broadcast })),
    } as unknown as Server;
    const gateway = new LobbyGateway(prisma);
    (gateway as unknown as { server: Server }).server = server;

    const addSession = (token: string, guestId: string, nickname: string) => {
      sessions.set(
        createHash('sha256').update(token).digest('hex'),
        {
          guestId,
          expiresAt: new Date(Date.now() + 60_000),
          guest: {
            fullName: nickname,
            profile: { nickname, avatarUrl: null },
          },
        },
      );
    };

    addSession('token-one', 'guest-one', 'Khách Một');
    addSession('token-two', 'guest-two', 'Khách Hai');
    const first = createSocket('socket-one', 'token-one');
    const second = createSocket('socket-two', 'token-two');

    await gateway.handleConnection(first.socket);
    await gateway.handleConnection(second.socket);
    gateway.handleChat(first.socket, { text: 'Xin chào!' });
    gateway.handleReaction(first.socket, { targetSeatId: 1, reactionId: 'heart' });
    gateway.handleReaction(first.socket, { targetSeatId: 1, reactionId: 'toString' });

    expect(broadcast).toHaveBeenCalledWith(
      'lobby:message',
      expect.objectContaining({ name: 'Khách Một', text: 'Xin chào!', seatId: 0 }),
    );
    expect(broadcast).toHaveBeenCalledWith(
      'lobby:reaction',
      expect.objectContaining({
        fromSeatId: 0,
        toSeatId: 1,
        reactionId: 'heart',
        message: 'tim nè em iu',
      }),
    );
    expect(
      broadcast.mock.calls.filter(([event]) => event === 'lobby:reaction'),
    ).toHaveLength(1);
    expect(first.emit).toHaveBeenCalledWith(
      'lobby:error',
      expect.objectContaining({ message: 'Hãy chọn một khách mời và icon hợp lệ.' }),
    );
  });

  it('rejects unauthenticated sockets without assigning a seat', async () => {
    const findUnique = vi.fn();
    const gateway = new LobbyGateway({
      guestSession: { findUnique },
    } as unknown as PrismaService);
    const socket = createSocket('anonymous');

    await gateway.handleConnection(socket.socket);

    expect(findUnique).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith(
      'lobby:error',
      expect.objectContaining({ message: 'Vui lòng đăng nhập để vào sảnh.' }),
    );
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });
});
