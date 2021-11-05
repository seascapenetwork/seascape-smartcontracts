let NftSwap = artifacts.require("NftSwap");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let ScapeMetadata = artifacts.require("ScapeMetadata");



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

    let nftSwap = await NftSwap.at("0xEA4920658614AA8F432f76d5505b7a31a4C3Eb57");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let scapeMetadata = await ScapeMetadata.at("0x8BDc19BAb95253B5B30D16B9a28E70bAf9e0101A");


    let user = accounts[1];
    console.log(`Using account ${user}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    let offerId = 7;

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
