FROM node:20

# Install ffmpeg for production usage (Debian-based image)
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only package files first for better caching
COPY package*.json ./

# Install dependencies (prefer npm ci when lockfile exists)
RUN set -eux; \
    if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

# Copy the rest of the server source
COPY server/ .

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Start the server
CMD ["node", "index.js"]