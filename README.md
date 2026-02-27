# WhatsApp Price Agent

A WhatsApp bot that lets UK shoppers track clothing prices across retailers.
Send a product link + target price → get notified when the price drops.

## How It Works

1. User sends a WhatsApp message like:
   `track £90 https://www.asos.com/product/...`
2. Bot confirms tracking and stores the item.
3. Server polls the page every 6 hours (configurable).
4. When price ≤ target, bot sends a WhatsApp alert.

## Supported Retailers

| Retailer | Domain | Notes |
|----------|--------|-------|
| ASOS | asos.com | JSON-LD + NextData |
| COS | cosstores.com / cos.com | JSON-LD + meta |
| Arket | arket.com | JSON-LD + meta |
| Mango | shop.mango.com | JSON-LD + CSS |
| Zalando | zalando.co.uk | JSON-LD (may be blocked) |
| Generic | any | OG tags, JSON-LD, £ pattern scan |

---

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (local Docker or Supabase)
- Twilio account with WhatsApp Sandbox (or live number)

---

## Setup

### 1. Clone & install

```bash
git clone <repo>
cd whatsapp-price-agent
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/price_agent
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
APP_BASE_URL=https://your-ngrok-url.ngrok.io
PORT=3000
CHECK_INTERVAL_MINUTES=360
```

### 3. Start PostgreSQL

Using Docker Compose (provided below) or an existing Postgres instance.

```bash
docker compose up -d db
```

Or manually:
```bash
createdb price_agent
```

### 4. Run migrations

```bash
npm run migrate
```

### 5. Start the server

Development (with auto-reload):
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

---

## Twilio WhatsApp Setup

### Sandbox (Development)

1. Go to [Twilio Console → Messaging → Try it out → WhatsApp](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Follow sandbox join instructions (send "join <word>" from your phone)
3. Under **Sandbox Configuration**, set:
   - **When a message comes in**: `https://YOUR_NGROK_URL/twilio/whatsapp`
   - Method: `HTTP POST`

### Production (Live Number)

1. Request a WhatsApp Business number in Twilio Console
2. Update `TWILIO_WHATSAPP_FROM` with your live number
3. Set webhook to your production URL

---

## Exposing Localhost with ngrok

```bash
# Install ngrok (https://ngrok.com)
ngrok http 3000
# Copy the https:// URL into APP_BASE_URL and your Twilio sandbox config
```

---

## Docker Compose

```yaml
version: '3.9'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: price_agent
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/price_agent
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
      TWILIO_WHATSAPP_FROM: ${TWILIO_WHATSAPP_FROM}
      APP_BASE_URL: ${APP_BASE_URL}
    depends_on:
      - db

volumes:
  pg_data:
```

---

## Bot Commands

| User sends | Bot does |
|-----------|----------|
| `track £120 https://...` | Starts tracking, confirms |
| `notify me at 75 https://...` | Same as above |
| `LIST` | Shows all active tracked items |
| `STATUS <id>` | Shows last price + time for an item |
| `STOP <id>` | Stops tracking an item |
| `HELP` | Shows command reference |

**ID** in STOP/STATUS is the first 8 characters shown in LIST output.

---

## Testing the Webhook Locally

### Simulate a TRACK message

```bash
curl -X POST http://localhost:3000/twilio/whatsapp \
  -d "From=whatsapp:+447700900000" \
  -d "Body=track+120+https://www.asos.com/product/fancy-jacket/123456"
```

### Simulate LIST

```bash
curl -X POST http://localhost:3000/twilio/whatsapp \
  -d "From=whatsapp:+447700900000" \
  -d "Body=LIST"
```

### Simulate STOP

```bash
curl -X POST http://localhost:3000/twilio/whatsapp \
  -d "From=whatsapp:+447700900000" \
  -d "Body=STOP+abc12345"
```

### Simulate STATUS

```bash
curl -X POST http://localhost:3000/twilio/whatsapp \
  -d "From=whatsapp:+447700900000" \
  -d "Body=STATUS+abc12345"
```

### Health check

```bash
curl http://localhost:3000/health
```

---

## Adding a New Retailer Adapter

1. Create `src/adapters/myretailer.ts`:

```typescript
import { RetailerAdapter, PriceResult } from '../types';
import { fetchHtml } from './fetch';
import * as cheerio from 'cheerio';

export const myRetailerAdapter: RetailerAdapter = {
  canHandle(url: string): boolean {
    return url.includes('myretailer.com');
  },
  async fetchPrice(url: string): Promise<PriceResult> {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    // ... extract price
    return { pricePennies: 9999, currency: 'GBP', title: 'My Item' };
  },
};
```

2. Register it in `src/adapters/index.ts` — add it to the `adapters` array **before** `genericAdapter`.

---

## Data Model

```
users
  id, phone_e164, created_at

tracked_items
  id, user_id, url, retailer
  target_price_gbp_pennies, last_price_gbp_pennies
  last_checked_at, alert_sent_at
  status (active|stopped|error), error_message
  title, created_at

price_checks  (debug log)
  id, tracked_item_id, checked_at, price_pennies, success, raw_snippet
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `TWILIO_ACCOUNT_SID` | ✅ | From Twilio console |
| `TWILIO_AUTH_TOKEN` | ✅ | From Twilio console |
| `TWILIO_WHATSAPP_FROM` | ✅ | `whatsapp:+14155238886` (sandbox) |
| `APP_BASE_URL` | ✅ | Public URL for webhook display |
| `PORT` | ❌ | Default: `3000` |
| `CHECK_INTERVAL_MINUTES` | ❌ | Default: `360` (6 hours) |

---

## Known Limitations (MVP)

- Zalando uses heavy JS rendering — scraping may return 403 or miss price
- No size-level tracking
- No cross-retailer SKU matching
- Alerts fire once per item; re-arm by stopping and re-tracking
- No auth on webhook (Twilio request validation not enforced yet — add `twilio.validateExpressRequest` for production)
