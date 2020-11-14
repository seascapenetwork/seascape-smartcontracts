var Crowns = artifacts.require("./CrownsToken.sol");

module.exports = function(deployer, network) {
    //if (network == "development") {
	deployer.deploy(Crowns).then(function(){
	    console.log("Crowns Test token contract was deployed at address: "+Crowns.address);
	});
    //}
};
