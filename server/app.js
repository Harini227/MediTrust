const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const config = require('./config');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

/* Security headers */


/* CORS - allow configured client origin, plus null-origin requests
   (browsers send Origin: null when a page is opened via file://, which
   happens during local dev/testing before deployment) */
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === 'null' || origin === config.clientUrl) {
        return callback(null, true);
      }


      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

/* Body parsing */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* Compression */
app.use(compression());

/* Request logging */
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

const connectDB = require('./config/db');

// Connect to database on API requests (reuses cached connection)
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

/* Rate limiting on all /api routes */
app.use('/api', apiLimiter);

/* Static file serving for local uploads (dev/MVP only) */
app.use('/uploads', express.static('server/uploads'));

/* Serve the frontend itself - visit http://localhost:5000/meditrust.html
   This avoids file:// CORS quirks entirely (same-origin as the API) */
app.use(express.static('client'));

/* API routes */
app.use('/api', routes);

/* Root */
app.get('/', (req, res) => {
  res.redirect('/meditrust.html');
});

/* 404 + error handling - must be last */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
