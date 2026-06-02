import { verifyToken } from '../utils/jwt.js';

const onlineUsers = new Map();

export function registerSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Missing token'));
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
    io.emit('presence:update', { userId, online: true });

    socket.on('video:join', (videoId) => socket.join(`video:${videoId}`));
    socket.on('video:leave', (videoId) => socket.leave(`video:${videoId}`));

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.emit('presence:update', { userId, online: false });
    });
  });
}

