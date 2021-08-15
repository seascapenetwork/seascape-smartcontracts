var Crowns = artifacts.require("./CrownsToken.sol");

let test = true;

module.exports = function(deployer, network) {

    deployer.deploy(Crowns, test).then(function(){
	    console.log("Crowns was deployed at: "+Crowns.address);
    });
}
				 
				 
