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
	    	console.log("Lp Mining contract was deployed at address: "+LpMining.address);
		});
    } else {
		deployer.deploy(LpMining, "0xbcf39F0EDDa668C58371E519AF37CA705f2bFcbd", "0xa304D289f6d0a30aEB33e9243f47Efa3a9ad437d").then(function(){
	    	console.log("Lp Mining contract was deployed at address: "+LpMining.address);
		});
    }
};
