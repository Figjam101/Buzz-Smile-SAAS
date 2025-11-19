FROM node:20

# Install ffmpeg for reliable thumbnail generation (Debian-based image)
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install server dependencies first for better caching
COPY buzz-smile-saas/server/package*.json ./server/
RUN cd server && npm ci || npm install

# Copy server source
COPY buzz-smile-saas/server ./server

# Environment
ENV NODE_ENV=production

# Start the server
CMD ["node", "server/index.js"]