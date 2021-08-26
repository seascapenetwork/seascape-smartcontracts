let Crowns = artifacts.require("CrownsToken");
let crowns;

    let ether = 1000000000000000000;

module.exports = async function(callback) {
    let res = await init();

    callback(null, res);
};

let init = async function() {

    let accounts = await web3.eth.getAccounts();
    console.log(accounts);
    const networkId = await web3.eth.net.getId();
    //let amount = web3.utils.toWei("100000", "ether");

    let crowns = await Crowns.at("0x060a267728405e183f380659BCa205fa2D150904");
    let bridge    = "0xe4Fd0BC0601d1f4E042e93D28C6A429B26dF1457";
    console.log("Crowns address: "+crowns.address);


    // console.log("Attemping to add bridge...");
    // let bridgeAdded = await crowns.addBridge(bridge).catch(console.error);
    // console.log("bridge added.");
    //
    // console.log("Attemping to mint crowns...");
    // let mintAmount = 1000;
    // let crownsMinted = await crowns.mint(accounts[0], mintAmount).catch(console.error);
    // console.log("crowns minted.");

    // console.log("Attemping to send crowns...");
    // let sendAmount = web3.utils.toWei("500", "ether");
    // await crowns.transfer(accounts[1], sendAmount, {from: accounts[0]}).catch(console.error);
    // console.log("Crowns were transferred");

    // console.log("Attemping to spend crowns...");
    // let spendAmount = web3.utils.toWei("344", "ether");
    // await crowns.spend(spendAmount, {from: accounts[0]}).catch(console.error);
    // console.log("Crowns were spend");

    let sender = accounts[0];
    console.log(`checking balance at ${sender}`);
    let balance = parseInt(await crowns.balanceOf(sender))/ether;
    console.log(`balance is ${balance} CWS`);

    sender = accounts[1];
    console.log(`checking balance at ${sender}`);
    balance = parseInt(await crowns.balanceOf(sender))/ether;
    console.log(`balance is ${balance} CWS`);



    // let unclaimedPayWave = await crowns.unclaimedPayWave();
    // unclaimedPayWave = parseInt(unclaimedPayWave);
    // console.log("unclaimedPayWave: " , unclaimedPayWave);
    //
    // let unconfirmedPayWave = await crowns.unconfirmedPayWave();
    // unconfirmedPayWave = parseInt(unconfirmedPayWave);
    // console.log("unconfirmedPayWave: " , unconfirmedPayWave);
    //
    // let totalPayWave = await crowns.totalPayWave();
    // totalPayWave = parseInt(totalPayWave);
    // console.log("totalPayWave: " , totalPayWave);

    console.log("attemping to paywave...");
    let receipt = await crowns.payWave({from: owner}).catch(console.error);
    console.log("paywaved");
    console.log(receipt);

};
