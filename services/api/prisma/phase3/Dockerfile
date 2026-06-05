FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install --production
COPY services/api/prisma/schema.prisma ./prisma/
RUN npx prisma generate
COPY services/api/prisma/phase3/ ./phase3/
ENV NODE_PATH=/app/node_modules
