module.exports = {
    compilers: {
	solc: {
	    version: "0.6.7"
	}
    },
    networks: {
       development: {
	   host: "blockchain",
	   port: 8545,
	   network_id: "*", // match any network
	   from: process.env.ADDRESS_1
       },
    }
};
