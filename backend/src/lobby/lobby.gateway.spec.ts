
import type { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { LobbyGateway } from './lobby.gateway.js';

interface SessionRecord {
  guestId: string;
  guest: {
    fullName: string;
    profile: {
      nickname: string;
      avatarUrl: string | null;
    };
  };
}

interface MockSocket {
  socket: Socket;
  emit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  join: ReturnType<typeof vi.fn>;
}

function createSocket(id: string, ticket?: string): MockSocket {
  const emit = vi.fn();
  const disconnect = vi.fn();
  const join = vi.fn().mockResolvedValue(undefined);

  const socket = {
    id,
    connected: true,
    handshake: {
      auth: ticket ? { ticket } : {},
      headers: {},
    },
    emit,
    disconnect,
    join,
  } as unknown as Socket;

  return { socket, emit, disconnect, join };
}

describe('LobbyGateway', () => {
  it('authenticates guests and broadcasts chat and approved reactions', async () => {
    const sessions = new Map<string, SessionRecord>();

    const findFirst = vi.fn(
      async ({ where }: {
        where: { id: string; guestId: string };
      }) => {
        const session = sessions.get(where.id);

        if (!session || session.guestId !== where.guestId) {
          return null;
        }

        return session;
      },
    );

    const prisma = {
      guestSession: { findFirst },
    } as unknown as PrismaService;

    const tickets = new Map([
      ['ticket-one', {
        guestId: 'guest-one',
        sessionId: 'session-one',
      }],
      ['ticket-two', {
        guestId: 'guest-two',
        sessionId: 'session-two',
      }],
    ]);

    const authService = {
      verifyLobbyTicket: vi.fn((ticket: string) => {
        return tickets.get(ticket) ?? null;
      }),
    } as unknown as AuthService;

    const broadcast = vi.fn();

    const server = {
      to: vi.fn(() => ({ emit: broadcast })),
    } as unknown as Server;

    const gateway = new LobbyGateway(prisma, authService);

    (gateway as unknown as { server: Server }).server = server;

    const addSession = (
      sessionId: string,
      guestId: string,
      nickname: string,
    ) => {
      sessions.set(sessionId, {
        guestId,
        guest: {
          fullName: nickname,
          profile: {
            nickname,
            avatarUrl: null,
          },
        },
      });
    };

    addSession('session-one', 'guest-one', 'Khách Một');
    addSession('session-two', 'guest-two', 'Khách Hai');

    const first = createSocket('socket-one', 'ticket-one');
    const second = createSocket('socket-two', 'ticket-two');

    await gateway.handleConnection(first.socket);
    await gateway.handleConnection(second.socket);

    gateway.handleChat(first.socket, { text: 'Xin chào!' });

    gateway.handleReaction(first.socket, {
      targetSeatId: 1,
      reactionId: 'heart',
    });

    gateway.handleReaction(first.socket, {
      targetSeatId: 1,
      reactionId: 'toString',
    });

    expect(broadcast).toHaveBeenCalledWith(
      'lobby:message',
      expect.objectContaining({
        name: 'Khách Một',
        text: 'Xin chào!',
        seatId: 0,
      }),
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
      broadcast.mock.calls.filter(
        ([event]) => event === 'lobby:reaction',
      ),
    ).toHaveLength(1);

    expect(first.emit).toHaveBeenCalledWith(
      'lobby:error',
      expect.objectContaining({
        message: 'Hãy chọn một khách mời và icon hợp lệ.',
      }),
    );
  });

  it('rejects unauthenticated sockets without assigning a seat', async () => {
    const findFirst = vi.fn();

    const prisma = {
      guestSession: { findFirst },
    } as unknown as PrismaService;

    const authService = {
      verifyLobbyTicket: vi.fn(),
    } as unknown as AuthService;

    const gateway = new LobbyGateway(prisma, authService);

    const socket = createSocket('anonymous');

    await gateway.handleConnection(socket.socket);

    expect(findFirst).not.toHaveBeenCalled();

    expect(socket.emit).toHaveBeenCalledWith(
      'lobby:error',
      expect.objectContaining({
        message: 'Vui lòng đăng nhập để vào sảnh.',
      }),
    );

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });
});
