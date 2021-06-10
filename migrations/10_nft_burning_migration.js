var NftBurning = artifacts.require("./NftBurning.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NftFactory.sol");
var Nft = artifacts.require("./SeascapeNft.sol");




module.exports = async function(deployer, network) {
      if (network == "ganache") {
				await deployer.deploy(Nft);
				console.log("To mint Nft it is using NFT Factory at address: "+Nft.address);
				await deployer.deploy(Crowns);
				console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
				await deployer.deploy(Factory, Nft.address);
				console.log("It is used with NFT Factory at address: "+Factory.address);
				await deployer.deploy(NftBurning, Crowns.address, Factory.address, Nft.address);
				console.log("NftBurning contract was deployed at address: "+NftBurning.address);
      }
      else if (network == "rinkeby") {
          var crowns = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
					var factory = "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0";
					var nft = "0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a";

          await deployer.deploy(NftBurning, crowns, factory, nft);
          console.log("NftBurning contract was deployed at address: "+NftBurning.address);
      }
      else if (network == "bsctestnet") {
          var crowns = "0x4Ca0ACab9f6B9C084d216F40963c070Eef95033B";
          var factory = "0x3eB88c3F2A719369320D731FbaE062b0f82F22e4";
          var nft = "0x66638F4970C2ae63773946906922c07a583b6069";

          await deployer.deploy(NftBurning, crowns, factory, nft);
          console.log("NftBurning contract was deployed at address: "+NftBurning.address);
        }
};
