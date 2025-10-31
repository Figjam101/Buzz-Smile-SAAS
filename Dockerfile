FROM node:20

# Install ffmpeg for media processing
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Build from the server subdirectory
WORKDIR /app/server

# Copy package files from server and install production deps
COPY server/package*.json ./
RUN set -eux; \
    if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

# Copy the server source
COPY server/ .

ENV NODE_ENV=production

# Start the server
CMD ["node", "index.js"]