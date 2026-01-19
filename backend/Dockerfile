# Backend Dockerfile
FROM node:20-alpine AS builder

# Install dependencies for Sharp (image processing)
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  vips-dev \
  fftw-dev \
  build-base

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Explicitly install sharp for linux-musl (Alpine)
RUN npm install --os=linux --libc=musl --cpu=x64 sharp

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install runtime dependencies for Sharp
RUN apk add --no-cache \
  vips \
  fftw

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Explicitly install sharp for linux-musl (Alpine)
RUN npm install --os=linux --libc=musl --cpu=x64 sharp

# Generate Prisma client
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
