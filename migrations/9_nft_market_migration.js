var NftMarket = artifacts.require("./NftMarket.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Nft = artifacts.require("./SeascapeNft.sol");



var feesReciever = "0x02FfB10472155A986e87c99C4a25A2EF3E50eb36";
const tipsFeeRate = 100;

module.exports = function(deployer, network) {
	deployer.deploy(NftMarket, Crowns.address, Nft.address, feesReciever, tipsFeeRate)
	 .then(function(){
	    console.log("Staking contract was deployed at address: "+NftMarket.address);
	    console.log("It is using Crowns (CWS) Token at address: "+Crowns.address);
	    console.log("To mint Nft it is using NFT Factory at address: "+Nft.address);
	});
};
