var Nft = artifacts.require("./SeascapeNft.sol");
var Factory = artifacts.require("./NftFactory.sol");

const scapeNft = "0x607cBd90BE76e9602548Fbe63931AbE9E8af8aA7";

module.exports = function(deployer, network) {
    deployer.deploy(Factory, scapeNft).then(function(){
	    console.log("Nft Factory was deployed at address: "+Factory.address);
    });
};
