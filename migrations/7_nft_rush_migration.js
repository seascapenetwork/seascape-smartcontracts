var NftRush = artifacts.require("./NftRush.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NftFactory.sol");

var minDeposit = web3.utils.toWei('1', 'ether');
if (process.env.NFT_RUSH_MIN_DEPOSIT !== undefined) {
    minDeposit = web3.utils.toWei(process.env.NFT_RUSH_MIN_DEPOSIT.toString(), 'ether');
}

var maxDeposit = web3.utils.toWei('10', 'ether');
if (process.env.NFT_RUSH_MAX_DEPOSIT !== undefined) {
    maxDeposit = web3.utils.toWei(process.env.NFT_RUSH_MAX_DEPOSIT.toString(), 'ether');
}


module.exports = function(deployer, network) {
    if (network == "development") {
		deployer.deploy(NftRush, Crowns.address, Factory.address, minDeposit, maxDeposit).then(function(){
	    	console.log("Nft Brawl contract was deployed at address: "+NftRush.address);
		});
    } else if (network == "rinkeby") {
		let crowns = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
		let factory = "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0";

        deployer.deploy(NftRush, crowns, factory, minDeposit, maxDeposit).then(function(){
	    	console.log("Nft Brawl contract was deployed at address: "+NftRush.address);
			console.log("Don't forget to add Nft Rush in Nft factory into permissioned addresses");
		});
    }
};
