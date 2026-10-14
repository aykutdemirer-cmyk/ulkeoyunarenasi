FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY public ./public
ARG APP_VERSION=dev
ENV PORT=3000 NODE_ENV=production APP_VERSION=$APP_VERSION
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "server.js"]
