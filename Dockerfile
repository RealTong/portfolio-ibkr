# syntax=docker/dockerfile:1

FROM oven/bun:1.2.18 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build


FROM oven/bun:1.2.18 AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["bun", "run", "src/lib/server.ts"]

