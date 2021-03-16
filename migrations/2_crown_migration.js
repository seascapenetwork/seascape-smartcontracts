var Crowns = artifacts.require("./CrownsToken.sol");

module.exports = function(deployer, network) {
    deployer.deploy(Crowns).then(function(){
	    console.log("Crowns was deployed at: "+Crowns.address);
    });
}
				 
				 
