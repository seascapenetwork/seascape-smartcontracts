// var LpToken = artifacts.require("./LpToken.sol");
var Riverboat = artifacts.require("./RiverBoat.sol");

module.exports = function(deployer, _network) {
		deployer.deploy(Riverboat).then(function(){
			console.log("RIB on address: "+Riverboat.address);
		});
};
