let HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
    networks: {
      development: {
        host: "local-node",
        port: 8545,
        network_id: "*" // Match any network id
      },
      moonriver: {
        provider: function() {
          return new HDWalletProvider({
              privateKeys: [process.env.ACCOUNT_1],
              providerOrUrl: "https://rpc.moonriver.moonbeam.network",
              addressIndex: 0
          })
        },
        network_id: 1285
      },
      rinkeby: {
        provider: function() {
          return new HDWalletProvider({
            privateKeys: [process.env.ACCOUNT_1],
            providerOrUrl: process.env.REMOTE_HTTP,
            addressIndex: 0
          })
        }
      }
    },
    compilers: {
      solc: {
        version: "0.6.7"
      }
    }
  };