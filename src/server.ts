/**
 * WhatsApp Price Agent — entry point.
 */
import express from 'express';
import { config } from './config';
import { whatsappRouter } from './routes/whatsapp';
import { startScheduler } from './services/scheduler';
import { pool } from './db/client';

const app = express();

// Parse URL-encoded bodies (Twilio sends form-encoded POST bodies)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Twilio webhook route
app.use('/twilio/whatsapp', whatsappRouter);

// Graceful shutdown
async function shutdown() {
  console.log('[server] Shutting down...');
  await pool.end();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start
app.listen(config.port, () => {
  console.log(`[server] Listening on port ${config.port}`);
  console.log(`[server] Webhook URL: ${config.appBaseUrl}/twilio/whatsapp`);
  startScheduler();
});

export default app;
