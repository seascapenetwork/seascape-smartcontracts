# Truffle in docker

FROM node:14.13.1

# Install essential OS packages
RUN apt-get update
RUN apt-get install --yes build-essential inotify-tools git python g++ make

WORKDIR /home/node/app

COPY ./package.json /home/node/app/package.json
RUN npm install -g truffle

ENTRYPOINT []
