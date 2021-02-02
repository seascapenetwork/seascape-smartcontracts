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
    await payWave(owner);
};

let payWave = async function(owner) {
    let receipt = await crowns.payWave({from: owner});
    console.log("paywaved");
    console.log(receipt);
};
