FROM node
MAINTAINER Alessandro Poli <bollicino@mondora.com>

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY . /usr/src/app
RUN npm install

# Configure the listening port
ENV PORT 80
EXPOSE 80

CMD [ "npm", "start" ]
