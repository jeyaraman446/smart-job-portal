# Multi-stage Docker build for MERN Job Portal
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm --prefix server install
RUN npm --prefix client install

# Copy source files
COPY server/ ./server/
COPY client/ ./client/

# Build client production bundle
RUN npm --prefix client run build

# Production runtime container
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5001

COPY package.json ./
COPY server/ ./server/
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/client/dist ./client/dist

# Ensure upload directories exist
RUN mkdir -p server/uploads/resumes server/uploads/company_docs

EXPOSE 5001

CMD ["node", "server/server.js"]
