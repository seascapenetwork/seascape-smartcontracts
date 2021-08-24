var LpToken = artifacts.require("./LpToken.sol");

module.exports = function(deployer, network) {
		deployer.deploy(LpToken).then(function(){
			console.log("Lp Test token contract was deployed at address: "+LpToken.address);
		});
};
