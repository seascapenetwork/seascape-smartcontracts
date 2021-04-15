var LpMining = artifacts.require("./LpMining.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var NftFactory = artifacts.require("./NftFactory.sol");


module.exports = function(deployer, network) {
    if (network == "development") {
		deployer.deploy(LpMining, Crowns.address, NftFactory.address).then(function(){
	    	console.log("Lp Mining contract was deployed at address: "+LpMining.address);
	    	console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
	    	console.log("It is using Nft Factory address: "+NftFactory.address);
		});
    } else if (network == "rinkeby") {
        	deployer.deploy(LpMining, "0x168840df293413a930d3d40bab6e1cd8f406719d", "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0").then(function(){
	    	console.log("Profit Circus contract was deployed at address: "+LpMining.address);
		});
    } else {
		let crowns = "0x4Ca0ACab9f6B9C084d216F40963c070Eef95033B";
		let factory = "0x3eB88c3F2A719369320D731FbaE062b0f82F22e4";

		deployer.deploy(LpMining, crowns, factory).then(function(){
	    	console.log("Profit Circus contract was deployed at address: "+LpMining.address);
		});
    }
};
