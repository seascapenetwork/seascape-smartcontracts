let Crowns = artifacts.require("CrownsToken");
let crowns;

module.exports = async function(callback) {
    let res = await init();

    callback(null, res);
};

let init = async function() {
    accounts = await web3.eth.getAccounts();

    const networkId = await web3.eth.net.getId();

    crowns = await Crowns.at("0xFde9cad69E98b3Cc8C998a8F2094293cb0bD6911");
    console.log("Crowns address: "+crowns.address);

    let owner = accounts[0];
    await payWave(owner);
};

let payWave = async function(owner) {
    let receipt = await crowns.payWave({from: owner});
    console.log("paywaved");
    console.log(receipt);
};
