FROM node
MAINTAINER Alessandro Poli <bollicino@mondora.com>

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . /usr/src/app
RUN yarn install

EXPOSE 3000

CMD [ "yarn", "start" ]
