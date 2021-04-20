var NftBurning = artifacts.require("./NftBurning.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NftFactory.sol");
var Nft = artifacts.require("./SeascapeNft.sol");



module.exports = function(deployer, network) {
	deployer.then(async () => {

	await deployer.deploy(Nft);
	console.log("To mint Nft it is using NFT Factory at address: "+Nft.address);
	await deployer.deploy(Crowns);
	console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
	await deployer.deploy(Factory);
	console.log("It is used with NFT Factory at address: "+Factory.address);
	await deployer.deploy(NftBurning, Crowns.address, Factory.address, Nft.address);
	console.log("NftBurning contract was deployed at address: "+NftBurning.address);
	});
};
