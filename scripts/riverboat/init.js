let CrownsToken = artifacts.require("CrownsToken");

// global variables
let accounts;
let multiplier = 1000000000000000000;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {

    //--------------------------------------------------
    // Accounts and contracts configuration
    //--------------------------------------------------

    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let mscpToken = await CrownsToken.at("0x1aBB8FdE5e64be3419FceF80df335C68dD2956C7");

    let bridge = "0x911F32FD5d347b4EEB61fDb80d9F1063Be1E78E6";
    let owner = accounts[0];
    console.log(`Using account ${owner}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    let investorAddress = "";

    // contract calls
    await addBridge();


    async function addBridge(){
      console.log("attempting to add bridge...");
      await mscpToken.addBridge(bridge);
      console.log(`bridge added`);

      let isBuyer = await mscpToken.bridges(bridge);
      console.log(isBuyer);
    }


}.bind(this);
