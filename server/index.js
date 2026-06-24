require('dotenv').config();
require('./middleware/validateEnv')();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const compression = require('compression');
const path    = require('path');
const prisma  = require('./prisma/client');

const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust reverse proxy (nginx, Cloudflare, etc.) for correct IP rate-limiting
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,  // allow embedding whatsapp media
  contentSecurityPolicy: false,       // handled at nginx level in production
}));

// Gzip responses
app.use(compression());

// Webhook must be mounted BEFORE express.json() so raw body is available for signature verification
app.use('/api/webhook', require('./routes/webhook'));

// CORS — in production the server serves the frontend itself, so allow same origin
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:4176')
  .split(',')
  .map(url => url.trim());

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true
}));

app.use(express.json());

// Locally-stored uploads (e.g. business profile photos) — move to CDN later
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting — the strict auth limiter is applied per-route inside routes/auth.js (login/register
// only), so it doesn't throttle the frequently-called GET /me. General API limiter covers everything.
app.use('/api', apiLimiter);

// API routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/contacts',   require('./routes/contacts'));
app.use('/api/messages',   require('./routes/messages'));
app.use('/api/templates',  require('./routes/templates'));
app.use('/api/broadcasts', require('./routes/broadcasts'));
app.use('/api/settings',   require('./routes/settings'));
app.use('/api/analytics',  require('./routes/analytics'));
app.use('/api/costs',      require('./routes/costs'));
app.use('/api/platform',   require('./routes/platform'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/billing',    require('./routes/billing'));

// Health check — load balancers and uptime monitors hit this
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', uptime: Math.floor(process.uptime()), db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// Serve built React frontend in production (no nginx required)
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(require('./middleware/errorHandler'));

// Scheduler
const { start } = require('./services/schedulerService');
start();

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () =>
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
);

// Graceful shutdown — PM2 / Docker send SIGTERM
const shutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force exit if shutdown takes too long
  setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
