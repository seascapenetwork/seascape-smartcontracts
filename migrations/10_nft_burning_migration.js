var NftBurning = artifacts.require("./NftBurning.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NftFactory.sol");
var Nft = artifacts.require("./SeascapeNft.sol");



module.exports = function(deployer, network) {
	deployer.then(async () => {

	await deployer.deploy(Nft);
	console.log("To mint Nft it is using NFT Factory at address: "+Nft.address);
	await deployer.deploy(Crowns);
	console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
	await deployer.deploy(Factory);
	console.log("It is used with NFT Factory at address: "+Factory.address);
	await deployer.deploy(NftBurning, Crowns.address, Factory.address, Nft.address);
	console.log("NftBurning contract was deployed at address: "+NftBurning.address);
	});
};





module.exports = async function(deployer, network) {
      if (network == "ganache") {
				await deployer.deploy(Nft);
				console.log("To mint Nft it is using NFT Factory at address: "+Nft.address);
				await deployer.deploy(Crowns);
				console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
				await deployer.deploy(Factory);
				console.log("It is used with NFT Factory at address: "+Factory.address);
				await deployer.deploy(NftBurning, Crowns.address, Factory.address, Nft.address);
				console.log("NftBurning contract was deployed at address: "+NftBurning.address);
      }
      else if (network == "rinkeby") {
          var crowns = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
					var factory = "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0";
					var nft = "0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a";

          await deployer.deploy(NftBurning, crowns, factory, nft)
          console.log("NftBurning contract was deployed at address: "+NftBurning.address);
        }
};
