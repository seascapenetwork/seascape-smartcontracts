var ProfitCircus = artifacts.require("./ProfitCircus.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var NftFactory = artifacts.require("./NftFactory.sol");

module.exports = async function(deployer, network) {
	let crowns;
	let factory;

		crowns = "0xFde9cad69E98b3Cc8C998a8F2094293cb0bD6911";
		factory = "0x06fddbD58cb286DC1e7a9eB50eF67c9215478670";


	deployer.deploy(ProfitCircus, crowns, factory)
	.then(() => {
		console.log("Profit Circus smartcontract was deployed at address: "+ProfitCircus.address);
		console.log("Now call, scripts/lp_mining/init.js with uncommenting nftFactory.addStaticUser(profitCircus.address)");
	});
};
