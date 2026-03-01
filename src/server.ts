/**
 * WhatsApp Price Agent — entry point.
 */
import express from 'express';
import { config } from './config';
import { whatsappRouter } from './routes/whatsapp';
import { startScheduler, runChecks } from './services/scheduler';
import { sendWhatsApp, msgAlert } from './services/whatsapp';
import { pool } from './db/client';

const app = express();

// Parse URL-encoded bodies (Twilio sends form-encoded POST bodies)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Manual trigger for price checks (dev/testing)
app.post('/check', (_req, res) => {
  res.json({ status: 'triggered' });
  runChecks().catch((err) => console.error('[check] Error:', err));
});

// Test alert — sends a WhatsApp notification directly (dev/testing)
app.post('/test-alert', async (req, res) => {
  const phone = req.body?.phone as string;
  if (!phone) { res.status(400).json({ error: 'phone required' }); return; }
  const msg = msgAlert({ price: '25.00', target: '30.00', url: 'https://example.com', title: 'Test Product' });
  await sendWhatsApp(phone, msg);
  res.json({ status: 'sent' });
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
