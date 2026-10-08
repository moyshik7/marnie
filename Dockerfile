# ==========================================
# Marnie - Multi-stage Dockerfile
# ==========================================

# ── Stage 1: Build Frontend ───────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production Server ────────────
FROM node:20-slim

# Install system dependencies required for native modules and shell execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    git \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend source code
COPY src/ ./src/
COPY branding/ ./branding/

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create persistent runtime directories
RUN mkdir -p /app/data /app/workspace

# Default environment configurations
ENV NODE_ENV=production \
    PORT=3000 \
    OLLAMA_BASE_URL=http://host.docker.internal:11434 \
    DEFAULT_MODEL=qwen3.5:9B \
    WORKSPACE_DIR=/app/workspace \
    DB_PATH=/app/data/marnie.db

EXPOSE 3000

VOLUME ["/app/data", "/app/workspace"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "src/main.js"]
