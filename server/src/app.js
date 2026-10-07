/**
 * app.js
 *
 * Express application factory. This file:
 *   1. Builds and configures the Express app (middleware stack + routes).
 *   2. Never calls app.listen() — that lives in server.js.
 *   3. Never touches Socket.IO — that also lives in server.js.
 *
 * Keeping listen() out of here allows the app to be imported in tests without
 * actually binding a port.
 *
 * Middleware order follows the spec exactly:
 *   helmet → cors → json/urlencoded → cookieParser → morgan →
 *   apiLimiter → routes → notFound → errorHandler
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { CLIENT_URL, NODE_ENV } = require('./config/env');
const { apiLimiter } = require('./middlewares/rateLimiter');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const router = require('./routes/index');

const app = express();

// 1. Helmet — sets secure HTTP headers (XSS protection, no sniff, etc.)
app.use(helmet());

// 2. CORS — only the configured client origin is allowed; credentials: true
//    so the httpOnly refreshToken cookie is sent on cross-origin requests
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// 3–4. Body parsers — limit to 10mb to allow base64 previews if needed
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Cookie parser — needed to read the httpOnly refreshToken cookie
app.use(cookieParser());

// 6. HTTP request logger
//    'dev' format in development (coloured, short), 'combined' in production
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// 7. Rate limiter on all /api/* routes (tighter auth limiter is applied inside auth.routes.js)
app.use('/api', apiLimiter);

// 8. Main API router
app.use('/api/v1', router);

// 9. 404 handler — catches anything that didn't match a route above
app.use(notFound);

// 10. Global error handler — MUST be last
app.use(errorHandler);

module.exports = app;
