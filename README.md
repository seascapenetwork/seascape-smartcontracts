# Seascape Ecosystem smartcontracts.
***Seascape Network**: https://seascape.network/*

*Detailed documentations: https://docs.seascape.network/*

*Already deployed smartcontract addresses: https://docs.seascape.network/smartcontracts/addresses*

This repository contains the smartcontracts of 
* [Seascape Minigames](https://app.seascape.network/)
* [NFT Marketplace](https://scape.store) 
* Crowns token. Ticker CWS, and pCWS on BNB Smart Chain.
* Scape NFT
* GameFi generic smartcontracts that you can use in your great games.

The Financal tools of Seascape Ecosystem is done by [Seastar Interactive](https://github.com/Seastarinteractive). The Seastarinteractive is responsible for smartcontracts of:
* [Moonscape - a free to play game on Moonbeam Network](https://moonscapegame.com)
* [Lighthouse IDO platform](https://seascape.house/)
* [Riverboats - a hidden gem of Seascape Network]
* [SeaDex - Dex on Moonbeam and Moonriver](https://seascape.finance/)

The game that is supported by Seascape Network, https://blocklords.com/ developed by Meta Kings studio. The public source codes are kept on
https://github.com/blocklords3d/

The abandoned codes and delayed codes from Seascape Network are kept on
https://github.com/seascape-archive/

# Audit
The Crowns, Seascape NFT and Profit Circus were audited by [Certik](https://certik.org). View [Seascape on Certik](https://certik.org/projects/seascape).
The other projects are audited by PekShield and Halborn.

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
