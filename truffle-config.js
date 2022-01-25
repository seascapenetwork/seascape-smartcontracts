var HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

module.exports = {
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    /// add here
},
    compilers: {
	solc: {
	    version: "0.6.7"
	}
    },
    networks: {
  development: {
	   host: "local-node",
	   port: 8545,
	   network_id: "*", // match any network
	   from: process.env.ADDRESS_1

        },
	rinkeby: {
    provider: function () {
        return new HDWalletProvider(process.env.MNEMONIC, "https://rinkeby.infura.io/v3/" + process.env.INFURA_API_KEY, 0, 5);
    },
	    network_id: 4,
	    skipDryRun: true // To prevent async issues occured on node v. 14. see:
	    // https://github.com/trufflesuite/truffle/issues/3008
	},
  bsctestnet: {
    provider: () => new HDWalletProvider(process.env.MNEMONIC, `https://data-seed-prebsc-1-s1.binance.org:8545/`, 0, 5),
    network_id: 97,
    confirmations: 10,
    timeoutBlocks: 200,
    skipDryRun: true
  },
  // Moonbase Alpha TestNet
  moonbase: {                 // alternative RPCs
    // https://moonbeam-alpha.api.onfinality.io/rpc?apikey=cb6ddff3-c8b5-491f-a4ac-9ac1a12daeb2
    // https://moonbeam-alpha.api.onfinality.io/public
    // https://rpc.api.moonbase.moonbeam.network
    provider: () => new HDWalletProvider(process.env.MNEMONIC,
      `https://rpc.api.moonbase.moonbeam.network`, 0, 5),
    network_id: 1287,
    gas: 5190000
  },
  // alternative  https://rpc.moonriver.moonbeam.network
  // https://moonriver.api.onfinality.io/public
  moonriver: {
    provider: () => new HDWalletProvider(process.env.MNEMONIC, 'https://rpc.moonriver.moonbeam.network', 0, 5),
    network_id: 1285
    //gasPrice: 20000000000
  },
  moonbeam: {
    provider: () => new HDWalletProvider(process.env.MNEMONIC, 'https://rpc.api.moonbeam.network', 0, 5),
    network_id: 1284,
    //gas: 5190000,
    gasPrice: 100000000000
  },
  bsc: {
    provider: () => new HDWalletProvider(process.env.MNEMONIC, `https://bsc-dataseed.binance.org/`, 0, 5),
    network_id: 56,
    confirmations: 10,
    timeoutBlocks: 200,
    skipDryRun: true
  },
  ganache: {
    host: "localhost",
    port: 9545,
    network_id: "*"
  }
}
};
