let Crowns = artifacts.require("CrownsToken");

module.exports = async function(callback) {
    let res = await init();

    callback(null, res);
};

let init = async function() {
    let accounts = await web3.eth.getAccounts();

    console.log(`Using account: ${accounts[0]}`);

    let amount = "1000000";
    let amountWei = web3.utils.toWei(amount, "ether");

    let crowns = await Crowns.at("0x6fc9651f45B262AE6338a701D563Ab118B1eC0Ce");

    console.log("Attemping to update the supply limit...");
    await crowns.setLimitSupply(amountWei).catch(console.error);
    console.log(`Limit was increased to ${amount}`);
};
