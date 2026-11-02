# STAGE 0 - Builder

FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .


# STAGE 1 - Runtime

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

COPY --from=builder /app/ ./

RUN npm prune --omit=dev

RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

CMD ["npm", "start"]
