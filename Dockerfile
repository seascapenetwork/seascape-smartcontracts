# Truffle in docker

FROM node:14.13.1

USER root

# Install essential OS packages
RUN apt-get update
RUN apt-get install --yes build-essential inotify-tools git python g++ make libsecret-1-dev

WORKDIR /home/node/app

COPY ./package.json /home/node/app/package.json
RUN npm install -g truffle
RUN npm install -g @graphprotocol/graph-cli
RUN npm install

ENTRYPOINT []
