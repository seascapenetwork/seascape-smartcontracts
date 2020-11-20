var Staking = artifacts.require("./Staking.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var NftFactory = artifacts.require("./NFTFactory.sol");


module.exports = function(deployer, network) {
    if (network == "development") {
	deployer.deploy(Staking, Crowns.address, NftFactory.address).then(function(){
	    console.log("Staking contract was deployed at address: "+Staking.address);
	    console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
	    console.log("It is using Nft Factory address: "+NftFactory.address);
	});
    } else if (network == "rinkeby") {
        deployer.deploy(Staking, Crowns.address, NftFactory.address).then(function(){
	    console.log("Staking contract was deployed at address: "+Staking.address);
	    console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
	    console.log("It is using Nft Factory address: "+NftFactory.address);
	});
    }
};
