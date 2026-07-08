import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { authService } from '@/services/authService';

let socket: Socket | null = null;
let refreshPromise: Promise<string | null> | null = null;

function getSocketConfig() {
  const state = useAuthStore.getState();
  return {
    token: state.accessToken,
    userId: state.user?._id || '',
  };
}

async function refreshSocketToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const state = useAuthStore.getState();
    if (!state.refreshToken) {
      return null;
    }

    try {
      const response = await authService.refreshToken(state.refreshToken);
      const nextToken = response.data?.access_token || response.access_token || response.accessToken || null;
      if (nextToken) {
        useAuthStore.setState({ accessToken: nextToken });
      }
      return nextToken;
    } catch {
      useAuthStore.getState().clearState();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function applyLatestAuth(targetSocket: Socket) {
  const { token, userId } = getSocketConfig();
  targetSocket.auth = { token };
  targetSocket.io.opts.query = { userId };
}

export function getSocket(): Socket {
  if (!socket) {
    // Lấy đúng tên biến VITE_SOCKET_URL từ file .env.production
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

    const { token, userId } = getSocketConfig();

    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token },
      query: { userId },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect_error', async (error) => {
      if (!error.message?.toLowerCase().includes('authentication')) {
        return;
      }

      const nextToken = await refreshSocketToken();
      if (!nextToken || socket?.connected) {
        return;
      }

      applyLatestAuth(socket);
      socket.connect();
    });
  }
  return socket;
}

export function connectSocket() {
  const skt = getSocket();
  if (!skt.connected) {
    applyLatestAuth(skt);
    skt.connect();
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
