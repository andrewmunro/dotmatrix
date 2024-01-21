FROM oven/bun

COPY . /app
WORKDIR /app

EXPOSE 3000
CMD [ "bun", "src/server.ts" ]