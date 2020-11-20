var Nft = artifacts.require("./SeascapeNft.sol");

module.exports = function(deployer, network) {
    deployer.deploy(Nft).then(function(){
	console.log("Seascape Nft deployed at address: "+Nft.address);
    });
};
 
