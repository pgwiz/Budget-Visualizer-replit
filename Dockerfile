FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all workspace artifacts
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build only api-server and budget-monitor
RUN pnpm -r --filter "./artifacts/api-server" --filter "./artifacts/budget-monitor" run build

# Final stage
FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm

# Copy package files for runtime
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy built artifacts
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/api-server/package.json ./artifacts/api-server/
COPY --from=builder /app/artifacts/budget-monitor/dist ./artifacts/budget-monitor/dist
COPY --from=builder /app/artifacts/budget-monitor/package.json ./artifacts/budget-monitor/

# Copy node_modules for production (api-server only needs runtime deps)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules

# Expose port (Render/Heroku will set PORT env var)
EXPOSE 3000

# Start API server
WORKDIR /app/artifacts/api-server
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
