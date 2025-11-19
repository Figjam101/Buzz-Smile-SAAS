FROM node:20

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci || npm install

COPY server ./server

# Environment
ENV NODE_ENV=production

# Start the server
CMD ["node", "server/index.js"]