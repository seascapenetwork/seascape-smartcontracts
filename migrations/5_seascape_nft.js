var NFT = artifacts.require("./SeascapeNFT.sol");

module.exports = function(deployer, network) {
    deployer.deploy(NFT).then(function(){
	console.log("Seascape NFT contract was deployed at address: "+NFT.address);
    });
};
 
