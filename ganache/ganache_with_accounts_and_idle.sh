#!/usr/bin/env bash
# I don't have a better way to pass double quotes to docker CMD/ENTRYPOINT
# Sorry about it :P
node /app/ganache-core.docker.cli.js --quiet --account="$ACCOUNT_1,100000000000000000000" --account="$ACCOUNT_2,100000000000000000000" -i $NETWORK_ID
