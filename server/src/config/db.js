/**
 * config/db.js
 *
 * Creates and manages the Mongoose connection to MongoDB Atlas.
 * Includes exponential-backoff reconnection logic so a transient network
 * blip doesn't permanently kill the server — Mongoose will keep retrying
 * rather than requiring a manual restart.
 */
const mongoose = require('mongoose');
const { MONGODB_URI, NODE_ENV } = require('./env');

// How many times to retry before giving up on initial connect
const MAX_RETRIES = 5;
// Starting delay (ms) — doubles on each retry (exponential back-off)
const INITIAL_RETRY_DELAY_MS = 1000;

let retries = 0;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      // Explicit TLS options fix "SSL alert number 80" on Windows when connecting
      // to MongoDB Atlas. Without these, some Node.js/OpenSSL builds reject the
      // Atlas TLS handshake silently. tls:true forces encrypted transport;
      // tlsAllowInvalidCertificates:false keeps certificate validation on (safe).
      tls: true,
      tlsAllowInvalidCertificates: false,
    });

    retries = 0; // reset on successful connect
    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    retries += 1;
    const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retries - 1);

    if (retries > MAX_RETRIES) {
      console.error('[DB] Could not connect to MongoDB after maximum retries. Exiting.');
      process.exit(1);
    }

    console.error(
      `[DB] Connection failed (attempt ${retries}/${MAX_RETRIES}). Retrying in ${delay}ms…\n  Reason: ${err.message}`
    );

    setTimeout(connectDB, delay);
  }
};

// Mongoose fires this when the connection is lost after a successful connect
mongoose.connection.on('disconnected', () => {
  if (NODE_ENV !== 'test') {
    console.warn('[DB] MongoDB disconnected — Mongoose will attempt to reconnect automatically.');
  }
});

mongoose.connection.on('error', (err) => {
  console.error(`[DB] Mongoose connection error: ${err.message}`);
});

module.exports = connectDB;
