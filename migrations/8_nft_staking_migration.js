var NftStaking = artifacts.require("./NftStaking.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NFTFactory.sol");
var Nft = artifacts.require("./SeascapeNFT.sol");


module.exports = function(deployer, network) {
    if (network == "development") {
	deployer.deploy(NftStaking, Crowns.address, Factory.address, Nft.address).then(function(){
	    console.log("Staking contract was deployed at address: "+NftStaking.address);
	    console.log("It is using Crowns (CWS) Token at address: "+Crowns.address);
	    console.log("To mint Nft it is using NFT Factory at address: "+Nft.address);

	});
    } else if (network == "rinkeby") {
        deployer.deploy(NftStaking, Crowns.address, Factory.address, Nft.address).then(function(){
	    console.log("Staking contract was deployed at address: "+NftStaking.address);
	    console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
	    console.log("To mint NFT it is using NFT Factory at address: "+Factory.address);
	    console.log("Seascape Nft at  address: "+Nft.address);
	});
    }
};
