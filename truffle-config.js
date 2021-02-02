var HDWalletProvider = require("truffle-hdwallet-provider");

module.exports = {
    compilers: {
	solc: {
	    version: "0.6.7"
	}
    },
    plugins: [
	'truffle-plugin-verify'
    ],
    api_keys: {
    },
    networks: {
       development: {
	   host: "local-node",
	   port: 8545,
	   network_id: "*", // match any network
	   from: process.env.ADDRESS_1
        },
	rinkeby: {
	    provider: function() { 
		return new HDWalletProvider(process.env.MNEMONIC, process.env.REMOTE_HTTP);
	    },
	    network_id: 4,
	    gasPrice: 100000000000, // 100 gwei
	    skipDryRun: true // To prevent async issues occured on node v. 14. see:
	    // https://github.com/trufflesuite/truffle/issues/3008
	},
	mainnet: {
	    provider: function() { 
		return new HDWalletProvider(process.env.MNEMONIC, process.env.REMOTE_HTTP);
	    },
	    gasPrice: 100000000000, // 100 gwei
	    network_id: 1,
	    skipDryRun: true // To prevent async issues occured on node v. 14. see:
	    // https://github.com/trufflesuite/truffle/issues/3008
	}

    }
};
