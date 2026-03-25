# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS runner

WORKDIR /app

# Only copy production artefacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production deps (esbuild bundled everything, just need native modules)
RUN npm ci --omit=dev

# Create directories for persistent data
RUN mkdir -p /app/data /app/uploads

# DB stored in /app/data (mount as volume)
ENV DATABASE_PATH=/app/data/motowarsztat.db
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
