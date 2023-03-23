let ContractWithOwnership = artifacts.require("CrownsToken");

// Returns the owner of the contract
module.exports = async function(callback) {
    accounts = await web3.eth.getAccounts();
    
    let address = "0x27d72484f1910F5d0226aFA4E03742c9cd2B297a";
    let contract = await ContractWithOwnership.at(address);

    let owner = await contract.owner();

    console.log(`Owner of ${address} is ${owner}`);

    callback();
};
