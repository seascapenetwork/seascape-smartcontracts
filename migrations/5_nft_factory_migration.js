var Nft = artifacts.require("./SeascapeNft.sol");
var Factory = artifacts.require("./NftFactory.sol");

module.exports = function(deployer, network) {
    deployer.deploy(Factory, "0xf0c27DB379AD997C225701EAf00344693B4b36e1").then(function(){
	    console.log("Nft Factory was deployed at address: "+Factory.address);
    });
};
