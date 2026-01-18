# Setup Guide - XYZ Salon Digital Voice Assistant

This guide walks you through setting up all required services: Twilio (telephony), OpenAI (voice AI), and Stripe (payments).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Twilio Setup](#twilio-setup)
3. [OpenAI Setup](#openai-setup)
4. [Stripe Setup](#stripe-setup)
5. [Database Setup](#database-setup)
6. [Application Setup](#application-setup)
7. [Testing](#testing)
8. [Going Live](#going-live)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 20+ installed
- [ ] Docker and Docker Compose installed (recommended)
- [ ] A credit card for service signups
- [ ] A domain name or ngrok account for webhooks
- [ ] Basic command line knowledge

### Estimated Costs (Monthly)

| Service | Test/Dev | Production |
|---------|----------|------------|
| Twilio | $1-5 | $50-200 |
| OpenAI | $5-20 | $50-300 |
| Stripe | Free (2.9% + $0.30 per txn) | Same |
| Hosting | Free-$25 | $25-100 |

---

## Twilio Setup

### Step 1: Create Twilio Account

1. Go to [twilio.com](https://www.twilio.com)
2. Click "Sign up"
3. Enter your email, name, and create password
4. Verify your email
5. Verify your phone number
6. Answer onboarding questions (select "Voice" as primary product)

### Step 2: Get API Credentials

1. From the Twilio Console dashboard
2. Find your **Account SID** (starts with "AC")
3. Find your **Auth Token** (click "Show" to reveal)
4. Save these to your `.env` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Purchase a Phone Number

1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. Search for a number (choose your area code)
3. Ensure **Voice** capability is checked
4. Click "Buy" (~$1.15/month for US numbers)
5. Save the number to your `.env`:

```env
TWILIO_VOICE_NUMBER=+1XXXXXXXXXX
```

### Step 4: Configure Voice Webhooks

After deploying your app (or using ngrok), configure webhooks:

1. Go to **Phone Numbers** → **Manage** → **Active numbers**
2. Click on your number
3. Under **Voice Configuration**:
   - **A CALL COMES IN**: Webhook, `https://your-domain.com/voice`, HTTP POST
   - **PRIMARY HANDLER FAILS**: (optional) backup URL
   - **CALL STATUS CHANGES**: `https://your-domain.com/voice/status`, HTTP POST

### Step 5: Enable Media Streams (for AI Voice)

1. Go to your Phone Number configuration
2. Under **Voice Configuration**, click "Configure with..."
3. Select **TwiML Bins** or **Webhooks**
4. Enable **Media Streams** in your account settings:
   - Go to **Voice** → **Settings** → **General**
   - Enable "Media Streams"

### Step 6: Set Transfer Number (Optional)

If you want calls transferred to a human:

```env
TWILIO_AGENT_TRANSFER_NUMBER=+1YYYYYYYYYY
```

### Twilio Pricing Reference

| Item | Cost |
|------|------|
| Phone Number | ~$1.15/month |
| Inbound Calls | ~$0.0085/min |
| Outbound Calls | ~$0.014/min |
| Recording | ~$0.0025/min |
| Transcription | ~$0.05/min |

---

## OpenAI Setup

### Step 1: Create OpenAI Account

1. Go to [platform.openai.com](https://platform.openai.com)
2. Click "Sign up"
3. Create account with email or Google/Microsoft SSO
4. Verify your email
5. Add a payment method (required for API access)

### Step 2: Get API Key

1. Go to **API Keys** in the left sidebar
2. Click "Create new secret key"
3. Name it (e.g., "XYZ Salon Voice Assistant")
4. Copy the key immediately (it won't be shown again!)
5. Save to your `.env`:

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Verify Realtime API Access

The Realtime API may require specific access:

1. Check your usage tier at **Settings** → **Limits**
2. You may need to be on Tier 2+ for Realtime access
3. To upgrade tiers, add credits and maintain good standing

### Step 4: Configure Model Settings

```env
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview
OPENAI_TTS_VOICE=alloy
OPENAI_STT_MODEL=whisper-1
```

**Available Voices (8 total):**

*Female:*
- `alloy` - Warm and conversational
- `shimmer` - Smooth and professional
- `coral` - Crisp and clear
- `sage` - Calm and composed

*Male:*
- `ash` - Clear and confident
- `ballad` - Rich and engaging
- `echo` - Balanced and natural
- `verse` - Dynamic and expressive

Voice selection is configurable via the Admin UI at `/admin/voices`.

### Step 5: Set Usage Limits (Recommended)

1. Go to **Settings** → **Limits**
2. Set a monthly budget limit
3. Set up usage alerts

### OpenAI Pricing Reference

| Model/Feature | Cost |
|---------------|------|
| GPT-4o Realtime (audio) | ~$0.06/min input, ~$0.24/min output |
| GPT-4o Realtime (text) | Standard token pricing |
| Whisper (STT) | ~$0.006/min |
| Text Embeddings | ~$0.00002/1K tokens |

---

## Stripe Setup

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Click "Start now"
3. Enter your email and create password
4. Verify your email
5. Complete business information:
   - Business type (Nonprofit/501c3)
   - Business details
   - Bank account for payouts

### Step 2: Get API Keys

1. From the Stripe Dashboard
2. Go to **Developers** → **API keys**
3. You'll see:
   - **Publishable key** (pk_test_... or pk_live_...)
   - **Secret key** (sk_test_... or sk_live_...)
4. Save to your `.env`:

```env
# Use test keys during development
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Configure Webhook

1. Go to **Developers** → **Webhooks**
2. Click "Add endpoint"
3. Enter your endpoint URL: `https://your-domain.com/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Click "Add endpoint"
6. Copy the **Signing secret** and save:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Test Mode vs Live Mode

- **Test Mode**: Use `pk_test_` and `sk_test_` keys
- **Live Mode**: Use `pk_live_` and `sk_live_` keys

Test card numbers for development:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

### Step 5: Configure Products (Optional)

You can pre-create products in Stripe:

1. Go to **Products** → **Add product**
2. Create products for each ticket type:
   - "Carlisle GA Ticket" - $15.00
   - "Carlisle VIP Ticket" - $30.00
   - "Harrisburg GA Ticket" - $15.00
   - "Harrisburg VIP Ticket" - $35.00

### Stripe Pricing Reference

| Item | Cost |
|------|------|
| Card Payments | 2.9% + $0.30 per transaction |
| ACH/Bank | 0.8% (max $5) |
| Monthly Fee | $0 |
| Nonprofit Discount | May apply - contact Stripe |

---

## Database Setup

### Option A: Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker compose --profile db --profile redis up -d
```

This uses the included `docker-compose.yml` with:
- PostgreSQL 16 on port 5432
- Redis 7 on port 6379

### Option B: Local Installation

**PostgreSQL:**
1. Download from [postgresql.org](https://www.postgresql.org/download/)
2. Install and create database:
```sql
CREATE DATABASE xyzsalon;
CREATE USER xyzsalon WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE xyzsalon TO xyzsalon;
```

**Redis:**
1. Download from [redis.io](https://redis.io/download/)
2. Start with `redis-server`

### Option C: Cloud Services

**PostgreSQL:** Supabase, Neon, Railway, or AWS RDS
**Redis:** Upstash, Redis Cloud, or AWS ElastiCache

### Database Connection

```env
DATABASE_URL=postgresql://user:password@localhost:5432/xyzsalon
REDIS_URL=redis://localhost:6379
```

---

## Application Setup

### Step 1: Clone and Install

```bash
cd C:\Salon-Digital-Assistant-CLCD
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### Step 3: Run Database Migrations

```bash
npx prisma migrate dev
```

### Step 4: Seed Initial Data

```bash
npm run seed
```

This creates:
- Sample service categories
- Knowledge base articles
- Default business hours

### Step 5: Start the Application

**Development:**
```bash
# Terminal 1: Web server
npm run dev

# Terminal 2: Background worker
npm run worker
```

**Production:**
```bash
npm run build
npm start
```

### Step 6: Expose Webhooks

**Using ngrok:**
```bash
ngrok http 3000
# Copy the https URL
```

**Using Docker:**
```bash
# Add to .env
NGROK_AUTHTOKEN=your_ngrok_token
NGROK_STATIC_DOMAIN=your-domain.ngrok.io

# Run with ngrok profile
docker compose --profile ngrok up
```

### Step 7: Configure Twilio Webhooks

Update your Twilio number with your public URL:
- Voice: `https://your-url.ngrok.io/voice`
- Status: `https://your-url.ngrok.io/voice/status`

---

## Testing

### Test Checklist

- [ ] Call your Twilio number
- [ ] Hear the greeting
- [ ] Test DTMF menu (press 1, 2, 3, etc.)
- [ ] Test voice conversation (press 9)
- [ ] Ask "What services do you offer?"
- [ ] Ask "How much is a haircut?"
- [ ] Test appointment booking flow (use test card)
- [ ] Test transfer to human
- [ ] Test voicemail

### Test Card Numbers (Stripe)

```
Success:        4242 4242 4242 4242
Decline:        4000 0000 0000 0002
Insufficient:   4000 0000 0000 9995
Expired:        4000 0000 0000 0069
```

Use any future expiration date and any 3-digit CVC.

### Admin UI Test

1. Visit `http://localhost:3000/admin?token=YOUR_TOKEN`
2. Check dashboard stats and recent calls
3. View call logs with caller names and durations
4. Check services are listed
5. Manage knowledge base (77+ docs across 24 languages)
6. Configure voice selection (8 voices) and language settings
7. Customize greeting message with preview
8. View analytics

---

## Going Live

### Pre-Launch Checklist

- [ ] Switch to Stripe live keys
- [ ] Verify Twilio number in production
- [ ] Configure production webhooks
- [ ] Set up monitoring/alerts
- [ ] Test end-to-end with real card
- [ ] Review PCI compliance
- [ ] Update recording disclosure
- [ ] Train staff on admin UI
- [ ] Document support procedures

### Environment Variables (Production)

```env
NODE_ENV=production

# Twilio (same keys work in prod)
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_VOICE_NUMBER=+1xxxx

# OpenAI
OPENAI_API_KEY=sk-xxxx

# Stripe (LIVE keys!)
STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx

# Database (production URL)
DATABASE_URL=postgresql://user:pass@prod-host:5432/xyzsalon

# Security
ADMIN_TOKEN=very-secure-random-token
PUBLIC_BASE_URL=https://your-production-domain.com
```

### Deployment Options

**Railway:**
```bash
railway login
railway up
```

**Render:**
- Connect GitHub repo
- Set environment variables
- Deploy

**Azure App Service:**
```bash
az webapp up --name xyz-salon --resource-group your-rg
```

See `docs/deploy.md` for detailed deployment guides.

---

## Troubleshooting

### Twilio Issues

**"No application URL" error:**
- Verify webhook URL is set on phone number
- Ensure ngrok is running and URL is current

**"Invalid SSL certificate":**
- Use HTTPS URL (ngrok provides this)
- Verify SSL certificate is valid

**"Authentication failed":**
- Check Account SID and Auth Token
- Ensure no extra spaces in .env values

### OpenAI Issues

**"Model not found":**
- Verify model name is correct
- Check API access tier for Realtime

**"Rate limit exceeded":**
- Add retry logic
- Consider upgrading usage tier

**"Invalid API key":**
- Regenerate API key
- Check for typos

### Stripe Issues

**"No such customer":**
- Verify you're using correct mode (test vs live)
- Check API key matches environment

**"Card declined":**
- Use test card numbers in test mode
- Check Stripe dashboard for details

**Webhook not receiving:**
- Verify webhook URL is accessible
- Check webhook signing secret
- Review Stripe webhook logs

### Database Issues

**"Connection refused":**
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify port is correct

**"Migration failed":**
- Run `npx prisma migrate reset` (dev only!)
- Check for conflicting migrations

---

## Support Resources

### Documentation

- [Twilio Voice Docs](https://www.twilio.com/docs/voice)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Prisma Docs](https://www.prisma.io/docs)

### Community

- [Twilio Community](https://community.twilio.com)
- [OpenAI Community](https://community.openai.com)
- [Stripe Discord](https://discord.gg/stripe)

### Emergency Contacts

Set up alerts for:
- Twilio: Console → Alerts
- Stripe: Dashboard → Developers → Webhooks → Alerts
- OpenAI: Settings → Limits → Usage alerts
