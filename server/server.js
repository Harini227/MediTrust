const config = require('./config');
const connectDB = require('./config/db');
const app = require('./app');
const logger = require('./utils/logger');

let server;

(async function start() {
  await connectDB();

  server = app.listen(config.port, () => {
    logger.info(`MediTrust API running in ${config.env} mode on port ${config.port}`);
  });
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
