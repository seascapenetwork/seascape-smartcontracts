
//var Crowns = artifacts.require("./CrownsToken.sol");
var NFTMarketV2 = artifacts.require("./NFTMarketV2.sol");





module.exports = function(deployer, network) {
	deployer.then(async () => {

	// await deployer.deploy(Crowns);
	// console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
	await deployer.deploy(NFTMarketV2);
	console.log("NFTMarketV2 contract was deployed at address: "+NFTMarketV2.address);
	});
};
