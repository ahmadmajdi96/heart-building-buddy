# syntax=docker/dockerfile:1.7

FROM oven/bun:1.2 AS build
WORKDIR /app

COPY package.json bun.lock* bunfig.toml ./
RUN bun install --frozen-lockfile || bun install

COPY . .
RUN bun run build

FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=build /app/.output ./.output

EXPOSE 5555

ENV HOST=0.0.0.0
ENV PORT=5555

CMD ["node", ".output/server/index.mjs"]
