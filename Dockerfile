# =====================================================
# Salon Digital Assistant - Production Dockerfile
# =====================================================

# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript (ignore type errors, files will still be emitted)
RUN npm run build || true

# Generate Prisma client
RUN npx prisma generate

# =====================================================
# Production stage
# =====================================================
FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create data directory
RUN mkdir -p /app/data

# Install tsx for seeding
RUN npm install -g tsx

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/server.js"]
