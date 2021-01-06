var HDWalletProvider = require("truffle-hdwallet-provider");

module.exports = {
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
	    provider: function() { 
		return new HDWalletProvider(process.env.MNEMONIC, process.env.REMOTE_HTTP);
	    },
	    network_id: 4,
	    skipDryRun: true // To prevent async issues occured on node v. 14. see:
	    // https://github.com/trufflesuite/truffle/issues/3008
	}
    }
};
