# The Seascape Network smartcontracts
This page contains the source code of Crowns, Scape NFT, Seascape DeFi game smartcontracts, and Scape store.

For more in-depth explanation, please visit https://docs.seascape.network/


The contract addresses in all deployed blockchain networks could be found at https://docs.seascape.network/smartcontracts/addresses

# Audit
The Crowns, Seascape NFT and Profit Circus were audited by [Certik](https://certik.org/).

The details of all contract audits can be seen at [Certik Security Leaderboard - Seascape](https://certik.org/projects/seascape)

## This repository depends on the following **submodules**:
 * crowns - an ERC-20 token of Seascape Network. https://seascape.network

# Running up on your machine
*It uses truffle framework.*

Pull this repository into your machine.

Once downloaded, go to the folder. Inside the folder, fetch the git submodules:
```git submodule update --init --recursive```

Then, we need to setup truffle as a global module:

```npm install -g truffle```

After that install local dependencies:

```npm install```

Compile the contracts to generate ABI interfaces of smartcontracts, to use in the scripts:
```truffle compile```

Finally, edit the ```truffle-config.js``` by setting up your network credentials including your Private Key and RPC node endpoint.

Done, check the tests, migrations and scripts. Edit them to set correct smartcontract address before using them. Especially, if you want to interact
with already deployed smartcontracts.
