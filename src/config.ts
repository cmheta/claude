function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

// Load .env in dev (tsx will pick up dotenv if present; we do it manually for robustness)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require('dotenv') as { config: () => void };
  config();
} catch {
  // dotenv not installed — rely on process.env being pre-populated
}

export const config = {
  port: parseInt(optional('PORT', '3000'), 10),
  databaseUrl: required('DATABASE_URL'),
  twilio: {
    accountSid: required('TWILIO_ACCOUNT_SID'),
    authToken: required('TWILIO_AUTH_TOKEN'),
    from: required('TWILIO_WHATSAPP_FROM'),
  },
  checkIntervalMinutes: parseInt(
    optional('CHECK_INTERVAL_MINUTES', '360'),
    10
  ),
  appBaseUrl: optional('APP_BASE_URL', 'http://localhost:3000'),
} as const;
