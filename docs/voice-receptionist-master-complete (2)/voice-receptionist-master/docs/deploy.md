# Deploy Guide (Railway / Render / Azure App Service)

## Railway (simple)
1. New Project → Deploy from GitHub (this repo).
2. Add a **Postgres** and **Redis** plugin. Copy their connection URLs into env.
3. Set env vars from `.env.example` (Twilio/OpenAI/Calendar/etc.).
4. Service commands:
   - Web: `npx prisma migrate deploy && node dist/server.js`
   - Worker: `node dist/queues/worker.js` (create a second service from the same repo).
5. Set the **Root Directory** to `/` and **Build Command** `npm ci && npx prisma generate && npm run build`.
6. Point your Twilio webhooks to the public URL.

## Render (container)
1. Create a **Web Service** and a **Background Worker** from the same repo.
2. Add a **PostgreSQL** and **Redis** service; set `DATABASE_URL`, `REDIS_URL`.
3. Build Command: `npm ci && npx prisma generate && npm run build`
4. Start Command (Web): `npx prisma migrate deploy && node dist/server.js`
5. Start Command (Worker): `node dist/queues/worker.js`

## Azure App Service (container)
1. Build & push the image (GitHub Actions or local) to ACR.
2. App Service for Containers → Set image and env vars.
3. For the worker, create a second App Service.
4. Use Azure Database for PostgreSQL and Azure Cache for Redis, or managed alternatives.
