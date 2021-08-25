var Crowns = artifacts.require("./CrownsToken.sol");

let type = 2;

module.exports = function(deployer, network) {
    deployer.deploy(Crowns, type).then(function(){
	    console.log("Crowns deployed on "+Crowns.address);
    });
}
				 
				 
