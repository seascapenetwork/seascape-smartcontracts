var Nft = artifacts.require("./SeascapeNft.sol");
var Factory = artifacts.require("./NftFactory.sol");

// const scapeNft = "0x607cBd90BE76e9602548Fbe63931AbE9E8af8aA7";

// moonbase
// const scapeNft = "0xB69aA417a1283618AACc0EAE123a1e01dE84f4AA"; 

// rinkeby
const scapeNft = "0xC1e3FA7c5550a5CE0e1f03F30a37f51139248478";

module.exports = function(deployer, network) {
    deployer.deploy(Factory, scapeNft).then(function(){
	    console.log("Nft Factory was deployed at address: "+Factory.address);
    });
};
