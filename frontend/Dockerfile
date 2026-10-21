# ==============================================================================
# CrowdVision AI - Frontend Multi-Stage Dockerfile
# Stage 1: Build React/Vite/Tailwind static bundle
# Stage 2: Serve using lightweight, secure Nginx Alpine image
# ==============================================================================

# --- Stage 1: Builder ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies using clean install
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source files
COPY . .

# Build production bundle into /app/dist
RUN npm run build

# --- Stage 2: Production Web Server ---
FROM nginx:alpine

# Install curl for Docker healthcheck probe
RUN apk add --no-cache curl

# Remove default nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled production bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy tailored Nginx reverse proxy configuration
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck testing the /healthz endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
