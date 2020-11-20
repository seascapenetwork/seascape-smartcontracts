var NFT = artifacts.require("./SeascapeNFT.sol");
var Factory = artifacts.require("./NFTFactory.sol");

module.exports = function(deployer, network) {
    deployer.deploy(Factory, NFT.address).then(function(){
	console.log("Seascape NFT Factory was deployed at address: "+Factory.address);
    });
};
 
