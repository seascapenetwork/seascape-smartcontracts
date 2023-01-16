let HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

// Add the private key, otherwise truffle framework will yell at you.
module.exports = {
    networks: {
      development: {
        host: "local-node",
        port: 8545,
        network_id: process.env.NETWORK_ID // Match any network id
      },
      moonriver: {
        provider: function() {
          return new HDWalletProvider({
              privateKeys: [""],
              providerOrUrl: "https://rpc.moonriver.moonbeam.network",
              addressIndex: 0
          })
        },
        network_id: 1285
      },
      bsc: {
        provider: function() {
          return new HDWalletProvider({
              privateKeys: [""],
              providerOrUrl: "https://bsc-dataseed4.defibit.io",
              addressIndex: 0
          })
        },
        network_id: 56
      },
      sepolia: {
        network_id: 11155111,
        provider: function() {
          return new HDWalletProvider({
            privateKeys: [""],
            providerOrUrl: "https://rpc.bordel.wtf/sepolia",
            addressIndex: 0
          })
        }
      }
    },
    compilers: {
      solc: {
        version: "0.6.7",
      }
    }
  };