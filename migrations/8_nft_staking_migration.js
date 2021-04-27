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
	    	console.log("Staking Saloon contract was deployed at address: "+NftStaking.address);
		});
    } else {
		let crowns = "0xbcf39F0EDDa668C58371E519AF37CA705f2bFcbd";
		let factory = "0xa304D289f6d0a30aEB33e9243f47Efa3a9ad437d";
		let nft = "0xc54b96b04AA8828b63Cf250408E1084E9F6Ac6c8";

		let gasPrice = await web3.eth.getGasPrice() * 1.3;
		let gasValue = 4700000;	    
	
        await deployer.deploy(NftStaking, crowns, factory, nft, {gas: gasValue, gasPrice: gasPrice}).then(function(){
	    	console.log("Staking Saloon contract was deployed at address: "+NftStaking.address);
		});
	}
};
