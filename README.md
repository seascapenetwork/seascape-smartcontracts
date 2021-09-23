# The Seascape Network smartcontracts
This page contains the source code of Crowns, Scape NFT, Mini game, and Scape store.

For more in-depth explanation, please visit https://docs.seascape.network/


The contract addresses in all deployed blockchain networks could be found at https://docs.seascape.network/smartcontracts/addresses

# Audit
The Crowns, Seascape NFT and Profit Circus were audited by [Certik](https://certik.org/).

The details of all contract audits can be seen at [Certik Security Leaderboard - Seascape](https://certik.org/projects/seascape)

## This repository depends on the following **submodules**:
 * crowns - an ERC-20 token used as a in-game token of Blocklords. Strategy game on ethereum at https://blocklords.io

# Running up on your machine
*This repo is develope using truffle framework.*

Pull this repository into your machine.

Inside the folder, fetch the git submodules, Crowns (CWS) is fetched as a submodule, and other smartcontracts depends on Crowns:

```git submodule update --init --recursive```

Then, we need to setup truffle as a global module:

```npm install -g truffle```

Then, we need to update the local dependencies:

```npm install```

Ccompile the contracts to generate ABI interfaces of smartcontracts, to use in the scripts:
```truffle compile```

Finally, edit the truffle-config.js by setting up your network credentials including your Private Key and RPC node endpoint.

Done, check the tests, migrations and scripts. Edit them to set correct smartcontract address before using them. Especially, if you want to interact
with already deployed smartcontracts.
