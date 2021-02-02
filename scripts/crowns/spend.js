let Crowns = artifacts.require("CrownsToken");
let crowns;

module.exports = async function(callback) {
    let res = init();

    callback(null, res);
};

let init = async function() {
    accounts = await web3.eth.getAccounts();

    const networkId = await web3.eth.net.getId();
    
    crowns = await Crowns.deployed();
    console.log("Crowns address: "+crowns.address);

    let owner = accounts[0];
    let user = accounts[1];
    let amount = web3.utils.toWei("5");

    await circulationSpend(user, amount);
};

let circulationSpend = async function(circulation, amount) {
    let receipt = await crowns.spend(amount, {from: circulation});
    console.log("circulation spent");
    console.log(receipt);
};
