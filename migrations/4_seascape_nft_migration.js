var Nft = artifacts.require("./SeascapeNft.sol");

module.exports = function(deployer, network) {
    deployer.deploy(Nft).then(function(){
	    console.log("Seascape Nft deployed on "+Nft.address);

        console.log("Now deploy factory, and add factory as the nft factory");
    });
};
 
