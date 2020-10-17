var Staking = artifacts.require("./Staking.sol");
if (process.env.STAKING !== undefined) {
    Staking.address = process.env.STAKING
}

module.exports = function(deployer) {
    deployer.deploy(Staking, process.env.CROWNS).then(function(){
	console.log("Staking contract was deployed at address: "+Staking.address);
	console.log("It is used with Crowns (CWS) Token at address: "+process.env.CROWNS);
    });
};
