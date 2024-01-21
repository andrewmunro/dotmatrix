FROM oven/bun

COPY . /app
WORKDIR /app

RUN bun install
RUN bun run build

EXPOSE 3000
CMD [ "bun", "src/server.ts" ]