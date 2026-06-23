# syntax=docker/dockerfile:1.7

FROM oven/bun:1.2 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* bunfig.toml ./
RUN bun install --frozen-lockfile || bun install

# Copy source
COPY . .

EXPOSE 5555

ENV HOST=0.0.0.0
ENV PORT=5555

CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5555"]
