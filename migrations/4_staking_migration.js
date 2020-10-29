var Staking = artifacts.require("./Staking.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
if (process.env.STAKING !== undefined) {
    Staking.address = process.env.STAKING
}

module.exports = function(deployer, network) {
    if (network == "development") {
	deployer.deploy(Staking, Crowns.address).then(function(){
	    console.log("Staking contract was deployed at address: "+Staking.address);
	    console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
	});
    } else if (network == "rinkeby") {
        deployer.deploy(Staking, process.env.CROWNS_RINKEBY).then(function(){
	    console.log("Staking contract was deployed at address: "+Staking.address);
	    console.log("It is used with Crowns (CWS) Token at address: "+process.env.CROWNS);
	});
    }
};
