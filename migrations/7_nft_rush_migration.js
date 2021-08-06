var NftBrawl = artifacts.require("./NftRush.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NftFactory.sol");
var NftBrawlManager = artifacts.require("./NftBrawlManager.sol");

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
		deployer.deploy(NftBrawl, Crowns.address, Factory.address, minDeposit, maxDeposit).then(function(){
	    	console.log("Nft Brawl contract was deployed at address: "+NftBrawl.address);
		});
    } else if (network == "rinkeby") {
		let crowns = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
		let factory = "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0";

        deployer.deploy(NftBrawl, crowns, factory, minDeposit, maxDeposit).then(function(){
	    	console.log("Nft Brawl contract was deployed at address: "+NftBrawl.address);
			console.log("Don't forget to add Nft Rush in Nft factory into permissioned addresses");
		});
    } else if (network == "ropsten") {
		let gelato = "0xCc4CcD69D31F9FfDBD3BFfDe49c6aA886DaB98d9";
		let crowns = "0xbd23fCD60bD2682dea6A3aad84b498c54d56c494";
		let factory = "0xc2DED3bCDB5Ee215Ae384903B99a34937DCBF47d";

		deployer.deploy(NftBrawl, crowns, factory, minDeposit, maxDeposit).then(function(){
			deployer.deploy(NftBrawlManager, NftBrawl.address, gelato).then(function(){
				console.log("Nft Brawl contract was deployed at address: "+NftBrawl.address);
				console.log("Nft Brawl Manager with Gelato wrapper contract was deployed at address: "+NftBrawlManager.address);
			});
		});
	} else {
		let crowns = "0xac0104cca91d167873b8601d2e71eb3d4d8c33e0"
		let factory = "0x25F4C38FAF75dF9622FECB17Fa830278cd732091";

        deployer.deploy(NftBrawl, crowns, factory, minDeposit, maxDeposit).then(function(){
	    	console.log("Nft Brawl contract was deployed at address: "+NftBrawl.address);
			console.log("Don't forget to add Nft Rush in Nft factory into permissioned addresses");
		});
	}
};
