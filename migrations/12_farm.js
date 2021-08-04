var FarmCake = artifacts.require("./FarmCake.sol");
var SeascapeHodl = artifacts.require("./SeascapeHodl.sol");

var ZombieFarm = artifacts.require("./ZombieFarm.sol");
var ScapeNftReward = artifacts.require("./ScapeNftReward.sol");
var SingleTokenChallenge = artifacts.require("./SingleTokenChallenge.sol");
var LpChallenge = artifacts.require("./LpChallenge.sol");
var Factory = artifacts.require("./NftFactory.sol");
var Crowns = artifacts.require("./CrownsToken.sol");

async function getAccount(id) {
    let accounts = await web3.eth.getAccounts();
    return accounts[id];
}

module.exports = async function(deployer, network) {
    if (network == "development") {
        let pool = await getAccount(0);

        await deployer.deploy(ZombieFarm, Crowns.address);
        await deployer.deploy(ScapeNftReward, Factory.address, ZombieFarm.address, pool);
        await deployer.deploy(SingleTokenChallenge, ZombieFarm.address, pool);
        await deployer.deploy(LpChallenge, ZombieFarm.address, pool);
        
        console.log("ZombieFarm contract was deployed at address: " + ZombieFarm.address);
		console.log("ScapeNftReward contract was deployed at address: " + ScapeNftReward.address);
		console.log("SingleTokenChallenge contract was deployed at address: " + SingleTokenChallenge.address);
		console.log("LpChallenge contract was deployed at address: " + LpChallenge.address);
    } else if (network == "rinkeby") {
        let pool = await getAccount(0);

        let factoryAddress = "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0";
        let crownsAddress = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";

        await deployer.deploy(ZombieFarm, crownsAddress);
        await deployer.deploy(ScapeNftReward, factoryAddress, ZombieFarm.address, pool);
        await deployer.deploy(SingleTokenChallenge, ZombieFarm.address, pool);
        await deployer.deploy(LpChallenge, ZombieFarm.address, pool);

        console.log("ZombieFarm contract was deployed at address: " + ZombieFarm.address);
		console.log("ScapeNftReward contract was deployed at address: " + ScapeNftReward.address);
		console.log("SingleTokenChallenge contract was deployed at address: " + SingleTokenChallenge.address);
		console.log("LpChallenge contract was deployed at address: " + LpChallenge.address);
    }
};
