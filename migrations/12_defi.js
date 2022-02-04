var StakeToken = artifacts.require("./StakeToken.sol");

async function getAccount(id) {
    let accounts = await web3.eth.getAccounts();
    return accounts[id];
}

module.exports = async function(deployer, network) {
    if (network == "development" || network == "ganache") {
        let vault = await getAccount(0);

        await deployer.deploy(StakeToken, vault);
        
        console.log(`StakeToken             deployed at ${StakeToken.address}`);
    } else if (network == "rinkeby") {
    }
};
