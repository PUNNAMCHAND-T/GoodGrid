/**
 * server.js
 *
 * Application entrypoint. This file:
 *   1. Imports and validates env (fails fast if anything required is missing)
 *   2. Connects to MongoDB
 *   3. Creates the HTTP server from the Express app
 *   4. Attaches Socket.IO to the HTTP server
 *   5. Starts listening on the configured PORT
 *
 * It is the ONLY file that calls listen() and the ONLY file that sets up
 * Socket.IO — keeping app.js independently testable.
 */
const http = require('http');
const { PORT } = require('./src/config/env'); // env validation runs here at import
const connectDB = require('./src/config/db');
const app = require('./src/app');
const initSockets = require('./src/sockets/index');

const server = http.createServer(app);

// Attach Socket.IO and all socket event handlers
const io = initSockets(server);
// Expose the io instance on the Express app so the HTTP chat controller
// can emit real-time events even when a message arrives over the HTTP fallback
app.set('io', io);

const start = async () => {
  // Connect to MongoDB before accepting traffic
  await connectDB();

  server.listen(PORT, () => {
    console.log(`[Server] GoodGrid API running on http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/v1/health`);
  });
};

// Surface any unhandled promise rejections (e.g. a broken mongoose query
// that somehow escaped asyncHandler) so they don't silently fail.
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled rejection at:', promise, 'reason:', reason);
  // Give the server a moment to finish in-flight requests before exiting
  server.close(() => process.exit(1));
});

start();
