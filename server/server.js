const config = require('./config');
const connectDB = require('./config/db');
const app = require('./app');
const logger = require('./utils/logger');

let server;

const net = require('net');

async function findFreePort(startPort, maxRetries = 5) {
  let port = startPort;
  for (let i = 0; i <= maxRetries; i++) {
    // attempt to listen with a raw net server
    const canUse = await new Promise((resolve) => {
      const tester = net.createServer()
        .once('error', (err) => {
          if (err.code === 'EADDRINUSE') resolve(false);
          else resolve(false);
        })
        .once('listening', function () {
          tester.close();
          resolve(true);
        })
        .listen(port, '::');
    });

    if (canUse) return port;
    port += 1;
  }
  throw new Error('No free port found');
}

(async function start() {
  await connectDB();

  const startPort = parseInt(config.port, 10) || 5000;
  try {
    const freePort = await findFreePort(startPort, 10);
    server = app.listen(freePort, () => {
      logger.info(`MediTrust API running in ${config.env} mode on port ${freePort}`);
    });
  } catch (err) {
    logger.error('Failed to find a free port to start the server: ' + (err.message || err));
    process.exit(1);
  }
})();

/* Graceful shutdown & crash safety */
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server?.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully.');
  server?.close(() => process.exit(0));
});
