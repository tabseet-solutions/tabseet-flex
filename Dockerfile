# ---- frontend build ----
FROM node:22-bookworm-slim AS webbuild
WORKDIR /app/web
COPY web/package.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# ---- runtime ----
FROM node:22-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server/package.json ./server/
RUN cd server && npm install --omit=dev

COPY server/ ./server/
COPY --from=webbuild /app/web/dist ./web/dist

ENV NODE_ENV=production
ENV PORT=4400
EXPOSE 4400

CMD ["node", "server/index.js"]
