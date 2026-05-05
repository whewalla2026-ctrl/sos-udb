FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/api/package.json ./services/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY services/api ./services/api
COPY packages/shared ./packages/shared

# Generate Prisma client
RUN cd services/api && pnpm prisma:generate

# Build
RUN pnpm --filter @udb/api build

FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm

COPY --from=builder /app/package.json ./
COPY --from=builder /app/services/api/package.json ./services/api/
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/prisma ./services/api/prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "services/api/dist/main"]
