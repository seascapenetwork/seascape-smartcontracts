var ZombieFarm = artifacts.require("./ZombieFarm.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NftFactory.sol");
var Nft = artifacts.require("./SeascapeNft.sol");

module.exports = async function(deployer, network) {
    if (network == "ganache") {
        await deployer.deploy(ZombieFarm);
		console.log("ZombieFarm contract was deployed at address: "+ZombieFarm.address);
    }
};
