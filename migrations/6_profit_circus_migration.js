var ProfitCircus = artifacts.require("./ProfitCircus.sol");

module.exports = async function(deployer, network) {
	const factory 	= "0x77478212aa57A7A9Cc5b611156Fce7c0697578fb";

	deployer.deploy(ProfitCircus, factory)
	.then(() => {
		console.log("Profit Circus smartcontract was deployed at address: "+ProfitCircus.address);
		console.log("Now call, scripts/profit_circus/init.js with uncommenting nftFactory.addStaticUser(profitCircus.address)");
	});
};
