var Crowns = artifacts.require("./CrownsToken.sol");

let type = 1;

module.exports = function(deployer, network) {
    deployer.deploy(Crowns, type).then(function(){
	    console.log("Crowns was deployed at: "+Crowns.address);
    });
}
