let Crowns = artifacts.require("CrownsToken");
let crowns;

module.exports = async function(callback) {
    let res = await init();

    callback(null, res);
};

let init = async function() {

    let accounts = await web3.eth.getAccounts();
    console.log(accounts);
    const networkId = await web3.eth.net.getId();
    let amount = web3.utils.toWei("100000", "ether");

    let crowns = await Crowns.at("0xFde9cad69E98b3Cc8C998a8F2094293cb0bD6911");
    let bridge    = "0xFC72F77e2f4fCcd2E4DEd30cF9d9eb806142505f";
    console.log("Crowns address: "+crowns.address);


    // console.log("Attemping to add bridge...");
    // let bridgeAdded = await crowns.addBridge(bridge).catch(console.error);
    // console.log("bridge added.");

    //let amount = 1000000;
    // console.log("Attemping to mint crowns...");
    // let crownsMinted = await crowns.mint(accounts[0], amount).catch(console.error);
    // console.log("crowns minted.");

    // should send crowns to an address
    console.log("Attemping to send crowns...");
    await crowns.transfer("0x5C6107cb3c3662DB1F9336757f89B42a557BF24C", amount, {from: accounts[0]}).catch(console.error);
    console.log("Crowns were transferred");
};
