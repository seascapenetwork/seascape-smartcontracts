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

    //await circulationToPool(user, owner, amount);
    await poolToCirculation(owner, user, amount);
};


let poolToCirculation = async function(pool, circulation, amount) {
    let receipt = await crowns.transfer(circulation, amount, {from: pool});
    console.log("pool to circulation");
    console.log(receipt);
};

let circulationToPool = async function(circulation, pool, amount) {
    let receipt = await crowns.transfer(pool, amount, {from: circulation});
    console.log("circulation to pool");
    console.log(receipt);
};
