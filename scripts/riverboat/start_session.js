let Riverboat = artifacts.require("Riverboat");
let RiverboatNft = artifacts.require("RiverboatNft");
let RiverboaFactory = artifacts.require("RiverboaFactory");


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

    let riverboat = await Riverboat.at("0x8E61f5028eEA48fdd58FD3809fc2202ABdBDC126");
    let riverboatNft     = await RiverboatNft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let riverboaFactory = await RiverboaFactory.at("0x8BDc19BAb95253B5B30D16B9a28E70bAf9e0101A");


    let owner = accounts[0];
    console.log(`Using account ${owner}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    let riverboatNftAddress = riverboatNft.address;
    let nftMetadataAddress = riverboaFactory.address;

    let tradeEnabled = true;
    let priceReceiver = owner;



    // contract calls
    await enableTrade();
    await setPriceReceiver();
    // NOTE add factory calls

    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // add currency address -only needs to run once per currency
    async function setPriceReceiver(){
        console.log("attempting to set price receiver...");
        await riverboat.setPriceReceiver(priceReceiver, {from: owner})
          .catch(console.error);
        console.log(`${currencyAddress} was set as price receiver`);
    }

    // enable trade (true/false) -only needs to run once
    async function enableTrade(){
      console.log("attempting to enable trade...");
      await riverboat.enableTrade(tradeEnabled, {from: owner});
      console.log(`tradeEnabled was set to ${tradeEnabled}`);
    }


}.bind(this);
