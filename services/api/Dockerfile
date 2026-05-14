FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY services/api/package.json services/api/
RUN pnpm install --frozen-lockfile
COPY services/api/prisma services/api/prisma
COPY services/api/tsconfig.json services/api/
COPY services/api/src services/api/src
RUN pnpm --filter @udb/api prisma:generate
RUN pnpm --filter @udb/api build

FROM node:20-slim AS runner
WORKDIR /app/services/api
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/services/api/node_modules ./node_modules
COPY --from=builder /app/services/api/dist ./dist
COPY --from=builder /app/services/api/package.json ./package.json
COPY --from=builder /app/services/api/prisma ./prisma
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:4000/health || exit 1
CMD ["node", "dist/src/main.js"]
