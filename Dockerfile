FROM node:16

COPY . /app
WORKDIR /app

RUN yarn

CMD [ "yarn", "start" ]