var ProfitCircus = artifacts.require("./ProfitCircus.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var NftFactory = artifacts.require("./NftFactory.sol");

module.exports = async function(deployer, network) {
	let crowns;
	let factory;

		crowns = "0xfC3C4136f8b2E19a6a759601D1aa4e29A8A502A1";
		factory = "0x3fd6Db81DD05e6054CBcddB0b2D4De37db2886d9";


	deployer.deploy(ProfitCircus, crowns, factory)
	.then(() => {
		console.log("Profit Circus smartcontract was deployed at address: "+ProfitCircus.address);
		console.log("Now call, scripts/lp_mining/init.js with uncommenting nftFactory.addStaticUser(profitCircus.address)");
	});
};
