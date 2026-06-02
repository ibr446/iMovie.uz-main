import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    if (!token) return;
    const nextSocket = io(import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000', {
      auth: { token }
    });

    nextSocket.on('presence:update', ({ userId, online }) => {
      setOnlineUsers((users) => ({ ...users, [userId]: online }));
    });

    setSocket(nextSocket);
    return () => nextSocket.disconnect();
  }, [token]);

  const value = useMemo(() => ({ socket, onlineUsers }), [socket, onlineUsers]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}

