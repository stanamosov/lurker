FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --no-progress --frozen-lockfile

COPY . .

RUN mkdir -p /data

WORKDIR /data

CMD ["bun", "run", "/app/src/index.js"]
