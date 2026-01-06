FROM node:20-alpine

# Install curl and wget for healthchecks
RUN apk add --no-cache curl wget

WORKDIR /usr/src/app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies using lockfile for reproducible builds
# npm ci is strict and will fail if package-lock.json is out of sync
RUN npm ci --no-audit --no-fund || (echo "Warning: npm ci failed, falling back to npm install" && npm install --no-audit --no-fund)

# Copy the rest of the application code
COPY . .

EXPOSE 3000

# Healthcheck for Docker Compose
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "run", "dev"]
