var Nft = artifacts.require("./SeascapeNft.sol");
var Factory = artifacts.require("./NftFactory.sol");

module.exports = function(deployer, network) {
    deployer.deploy(Factory, Nft.address).then(function(){
	    console.log("Nft Factory was deployed at address: "+Factory.address);
    });
};
 
