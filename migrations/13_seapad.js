var Tier = artifacts.require("./SeapadTier.sol");
var Submission = artifacts.require("./SeapadSubmission.sol");

// The SeapadTier (Tier) contract constructor parameters
// address _crowns, address _claimVerifier, uint256[3] memory _fees
var Crowns = artifacts.require("./CrownsToken.sol");
let claimVerifier = "";
let fees = [
    web3.utils.toWei("1", "ether"),     // Tier 0
    web3.utils.toWei("10", "ether"),    // Tier 1    
    web3.utils.toWei("50", "ether"),    // Tier 2
    web3.utils.toWei("100", "ether"),   // Tier 3
];

async function getAccount(index) {
    let accounts = await web3.eth.getAccounts();
    return accounts[index];
}

module.exports = async function(deployer, network) {
    claimVerifier = await getAccount(0);
    
    if (network == "development") {
        await deployer.deploy(Tier, Crowns.address, claimVerifier, fees);
        
        console.log("Deployed SeapadTier address: " + Tier.address);

        await deployer.deploy(Submission, Tier.address);
        console.log("Deployed SeapadSubmission address: " + Submission.address);
    } 
};
