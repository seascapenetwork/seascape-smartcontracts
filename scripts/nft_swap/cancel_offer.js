let NftSwap = artifacts.require("NftSwap");


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

    let nftSwap = await NftSwap.at("0xC971507165a17290cbAbC7133f95816D7a01bedD");


    let user = accounts[1];
    console.log(`Using account ${user}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    let offerId = 1;

    // contract calls
    await cancelOffer(offerId)

    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // cancel offer at id
    async function cancelOffer(_offerId){
      console.log("attempting to cancel offer...");
      await nftSwap.cancelOffer(_offerId, {from: user}).catch(console.error);
      console.log("offer canceled.");
    }


}.bind(this);
