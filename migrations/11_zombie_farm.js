var ZombieFarm = artifacts.require("./ZombieFarm.sol");
var ScapeNftReward = artifacts.require("./ScapeNftReward.sol");
var SingleTokenChallenge = artifacts.require("./SingleTokenChallenge.sol");
var Factory = artifacts.require("./NftFactory.sol");

async function getAccount(id) {
    let accounts = await web3.eth.getAccounts();
    return accounts[id];
}

module.exports = async function(deployer, network) {
    if (network == "development") {
        let pool = await getAccount(0);

        await deployer.deploy(ZombieFarm);
        await deployer.deploy(ScapeNftReward, Factory.address, ZombieFarm.address, pool);
        await deployer.deploy(SingleTokenChallenge, ZombieFarm.address, pool);
		console.log("ZombieFarm contract was deployed at address: " + ZombieFarm.address);
		console.log("ScapeNftReward contract was deployed at address: " + ScapeNftReward.address);
		console.log("SingleTokenChallenge contract was deployed at address: " + SingleTokenChallenge.address);
    }
};
