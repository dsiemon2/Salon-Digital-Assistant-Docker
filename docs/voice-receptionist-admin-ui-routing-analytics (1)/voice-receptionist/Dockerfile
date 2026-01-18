# Node 20 LTS
FROM node:20-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

ENV NODE_ENV=production
RUN npx prisma generate && npm run build

EXPOSE 3000
CMD ["node", "dist/server.js"]
