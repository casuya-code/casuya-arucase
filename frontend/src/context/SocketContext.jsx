import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getWebSocketUrl } from '../utils/backendUrl';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const auth = useAuth();

  const user = auth?.user;

  useEffect(() => {
    if (!auth?.isAuthenticated?.()) {
      setSocket((current) => {
        current?.close();
        return null;
      });
      setConnected(false);
      return undefined;
    }

    const wsUrl = getWebSocketUrl();
    if (!wsUrl) {
      return undefined;
    }

    let cancelled = false;
    let newSocket;

    (async () => {
      const { io } = await import('socket.io-client');
      if (cancelled) return;

      const token = localStorage.getItem('token');
      newSocket = io(wsUrl, {
        // Polling first — more reliable on Railway / proxies; upgrades to websocket when available
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 3,
        withCredentials: true,
        ...(token ? { auth: { token } } : {}),
      });

      newSocket.on('connect', () => {
        if (!cancelled) setConnected(true);
      });

      newSocket.on('disconnect', () => {
        if (!cancelled) setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        if (import.meta.env.DEV) {
          console.warn('Socket connection error:', error?.message || error);
        }
        if (!cancelled) setConnected(false);
        if (
          error?.message?.toLowerCase?.().includes('unauthorized') ||
          error?.message?.toLowerCase?.().includes('auth')
        ) {
          newSocket.io.opts.reconnection = false;
          newSocket.close();
        }
      });

      if (!cancelled) setSocket(newSocket);
    })();

    return () => {
      cancelled = true;
      newSocket?.close();
    };
  }, [user]);

  const value = {
    socket,
    connected,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
