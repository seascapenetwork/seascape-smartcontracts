var NftMarket = artifacts.require("./NftMarket.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Nft = artifacts.require("./SeascapeNft.sol");



module.exports = function(deployer, network) {
	deployer.deploy(NftMarket, Crowns.address, Nft.address).then(function(){
	    console.log("Staking contract was deployed at address: "+NftMarket.address);
	    console.log("It is using Crowns (CWS) Token at address: "+Crowns.address);
	    console.log("To mint Nft it is using NFT Factory at address: "+Nft.address);
	});
};
