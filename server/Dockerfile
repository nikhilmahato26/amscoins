# Multi-stage build for the ASM Coins backend (Express + Mongoose).
# Build context is server/ (see docker-compose.yml -> services.backend.build).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./
# src/lib/logger.js writes daily-rotated files to ./logs in production —
# WORKDIR is root-owned by default, so pre-create it for the nodejs user or
# the DailyRotateFile transport throws EACCES on boot and the process exits.
RUN mkdir -p logs && chown nodejs:nodejs logs
USER nodejs
EXPOSE 4000
# /api/health is proxied straight to this port's /health route (see routes/index.js)
CMD ["node", "src/server.js"]
