var LPToken = artifacts.require("./LP_Token.sol");

module.exports = function(deployer, network) {
	deployer.deploy(LPToken).then(function(){
	    console.log("LP Test token contract was deployed at address: "+LPToken.address);
	});

};
