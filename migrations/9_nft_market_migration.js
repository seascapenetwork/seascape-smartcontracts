var NftMarket = artifacts.require("./NftMarket.sol");
var Crowns = artifacts.require("./CrownsToken.sol");






module.exports = function(deployer, network) {
	deployer.then(async () => {

	await deployer.deploy(Crowns);
	console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
	await deployer.deploy(NftMarket, Crowns.address);
	console.log("NftMarket contract was deployed at address: "+NftMarket.address);
	});
};
