let ContractWithBridge = artifacts.require("CrownsToken");

module.exports = async function(callback) {
    let res = await init();

    callback(null, res);
};

let init = async function() {
    let accounts = await web3.eth.getAccounts();
    const networkId = await web3.eth.net.getId();

    console.log(`Network [${networkId}] The signer of the smartcontract: ${accounts[0]}`);


    let address = "0x6fc9651f45B262AE6338a701D563Ab118B1eC0Ce";
    let contract = await ContractWithBridge.at(address);
    let bridge    = "0x48A6fd66512D45006FC0426576c264D03Dfda304";

    console.log("Attempt to removing bridge...");
    await contract.removeBridge(bridge).catch(console.error);
    console.log("Bridge removed!");
};
