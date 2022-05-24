let CityNftSale = artifacts.require("CityNftSale");
let CityNft = artifacts.require("CityNft");
let MscpToken = artifacts.require("MscpToken");



let accounts;

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

    let cityNftSale = await CityNftSale.at("0x983D3460Fc959ee933EdCd766CfefC9cF9aFc637");
    let cityNft = await CityNft.at("0x94Bf67B24c98eb612054A407673E0C9e946ad466");
    let mscpToken = await MscpToken.at("0xB60590313975f0d98821B6Cab5Ea2a6d9641D7B6");


    let owner = accounts[0];
    console.log(`Using account ${owner}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    let currencyAddress = mscpToken.address;
    let nftAddress = cityNft.address;
    let startPrice = web3.utils.toWei("10", "ether");
    let priceIncrease = web3.utils.toWei("0.1", "ether");
    let startTime = 1643132400;
    let intervalDuration = 1800;
    let intervalsAmount = 2;


    // contract calls
    await startSession();

    // let receiver = "0xE71d14a3fA97292BDE885C1D134bE4698e09b3B7";
    // let transferAmount = web3.utils.toWei("783", "ether");
    // await mscpToken.transfer(receiver, transferAmount, {from: owner});
    // console.log("mscpToken was transfered");




    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // add currency address -only needs to run once per currency
    async function startSession(){
        console.log("attempting to start session...");
        await cityNftSale.startSession(currencyAddress, nftAddress, startPrice,
          priceIncrease, startTime, intervalDuration, intervalsAmount)
            .catch(console.error);

        let sessionId = parseInt(await cityNftSale.sessionId.call());
        console.log(`started session with id ${sessionId}`);
    }

}.bind(this);
