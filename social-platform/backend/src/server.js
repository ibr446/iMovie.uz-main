import http from 'http';
import { Server } from 'socket.io';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { registerSocket } from './socket/index.js';

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.clientUrl, credentials: true }
});

app.set('io', io);
registerSocket(io);

connectDb()
  .then(() => {
    server.listen(env.port, () => console.log(`API running on http://localhost:${env.port}`));
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
