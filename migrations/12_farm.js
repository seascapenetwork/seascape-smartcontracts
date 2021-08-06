var FarmCake = artifacts.require("./FarmCake.sol");
var SeascapeHodl = artifacts.require("./SeascapeHodl.sol");
var FarmCake = artifacts.require("./FarmCake.sol");

var ZombieFarm = artifacts.require("./ZombieFarm.sol");
var ScapeNftReward = artifacts.require("./ScapeNftReward.sol");
var SingleTokenChallenge = artifacts.require("./SingleTokenChallenge.sol");
var LpChallenge = artifacts.require("./LpChallenge.sol");
var Factory = artifacts.require("./NftFactory.sol");
var Crowns = artifacts.require("./CrownsToken.sol");

/// The Game that can interact with hodler
const testGame = "0x8A97Cc7e7407475C100eE9BE6712C4Ce7d39Cd26";
/// Stake this token to farm another token. This is LP token of BNB-CWS
const lpToken = "0x6615CE60D71513aA4849269dD63821D324A23F8C";
/// ID of farming of Cake with BNB-CWS
const pid = 333;
/// The PancakeSwap main contract that farms
const pancakeSwap = "0x73feaa1eE314F8c655E354234017bE2193C9E24E";
/// The Account that will receive the Farmed Cakes
const reward = "0x6342559B3C5Fc8E06Ff616936bDBc5FB1a471cBe";
/// The token that is farmed
const farm = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82";

async function getAccount(id) {
    let accounts = await web3.eth.getAccounts();
    return accounts[id];
}

module.exports = async function(deployer, network) {
    if (network == "development") {
        await deployer.deploy(SeascapeHodl, testGame);
        // constructor(address _stake, uint256 _pid, address _staking, address _hodl, address _reward, address _cake)
        await deployer.deploy(FarmCake, lpToken, pid, pancakeSwap, SeascapeHodl.address, reward, farm);
        
        console.log("SeacapeHodl contract was deployed at address: " + SeascapeHodl.address);
		console.log("FarmCake contract was deployed at address: " + FarmCake.address);
    } else if (network == "bsc") {
        await deployer.deploy(SeascapeHodl, testGame);
        // constructor(address _stake, uint256 _pid, address _staking, address _hodl, address _reward, address _cake)
        await deployer.deploy(FarmCake, lpToken, pid, pancakeSwap, SeascapeHodl.address, reward, farm);
        
        console.log("SeacapeHodl contract was deployed at address: " + SeascapeHodl.address);
		console.log("FarmCake contract was deployed at address: " + FarmCake.address);
    }
};
