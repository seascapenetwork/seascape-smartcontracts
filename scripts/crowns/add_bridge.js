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

    let crowns = await Crowns.at("0x6A2aBB18d0Bd0eF8573ECAD404fAa6f715cA0BC7");
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
    // let sendAmount = web3.utils.toWei("590", "ether");
    // await crowns.transfer(accounts[1], sendAmount, {from: accounts[0]}).catch(console.error);
    // console.log("Crowns were transferred");
    //
    // console.log("Attemping to spend crowns...");
    // let spendAmount = web3.utils.toWei("500", "ether");
    // await crowns.spend(spendAmount, {from: accounts[1]}).catch(console.error);
    // console.log("Crowns were spend");
    //
    // spendAmount = web3.utils.toWei("620", "ether");
    // await crowns.spend(spendAmount, {from: accounts[1]}).catch(console.error);
    // console.log("Crowns were spend");
    //
    let sender = accounts[0];
    console.log(`checking balance at ${sender}`);
    let balance = parseInt(await crowns.balanceOf(sender))/ether;
    console.log(`balance is ${balance} CWS`);

    sender = accounts[1];
    console.log(`checking balance at ${sender}`);
    balance = parseInt(await crowns.balanceOf(sender))/ether;
    console.log(`balance is ${balance} CWS`);
};
