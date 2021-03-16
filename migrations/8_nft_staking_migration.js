var NftStaking = artifacts.require("./NftStaking.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NftFactory.sol");
var Nft = artifacts.require("./SeascapeNft.sol");


module.exports = async function(deployer, network) {
    if (network == "development") {
		deployer.deploy(NftStaking, Crowns.address, Factory.address, Nft.address).then(function(){
	    	console.log("Staking contract was deployed at address: "+NftStaking.address);
	    	console.log("It is using Crowns (CWS) Token at address: "+Crowns.address);
	    	console.log("To mint Nft it is using NFT Factory at address: "+Nft.address);
		});
    } else if (network == "rinkeby") {
		let gasPrice = await web3.eth.getGasPrice();
		let gasValue = 4700000;	    
	
        await deployer.deploy(NftStaking, "0x168840Df293413A930d3D40baB6e1Cd8F406719D", "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0", "0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a",
			{gas: gasValue, gasPrice: gasPrice}).then(function(){
	    	console.log("Nft Staking contract was deployed at address: "+NftStaking.address);
		});
    }
};
