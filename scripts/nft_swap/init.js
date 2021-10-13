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

    let nftSwap = await NftSwap.at("0xa7354413e805458c405aa00A680FDB179AfCedd5");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let scapeMetadata = await ScapeMetadata.at("0x8BDc19BAb95253B5B30D16B9a28E70bAf9e0101A");


    let owner = accounts[0];
    console.log(`Using ${owner}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    let feeRate = web3.utils.toWei("100", "milli");
    let tradeEnabled = true;
    let currencyAddress = crowns.address;
    let nftAddress = nft.address;
    let nftMetadataAddress = scapeMetadata.address;

    await addSupportedCurrency(currencyAddress);
    await addSupportedNft(nftAddress, nftMetadataAddress);
    await setFee(feeRate);
    await enableTrade(tradeEnabled);

    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // enable trade (true/false) -only needs to run once
    async function enableTrade(tradeEnabled){
      console.log("attempting to enable trade...");
      await nftSwap.enableTrade(tradeEnabled, {from: owner});
      console.log(`tradeEnabled was set to ${tradeEnabled}`);
    }

    // add currency address -only needs to run once per currency
    async function addSupportedCurrency(currencyAddress){
        console.log("attempting to add supported currency...");
        await nftSwap.addSupportedBountyAddresses(currencyAddress, {from: owner})
          .catch(console.error);
        console.log(`${currencyAddress} currency address added`);
    }

    // add nft address -only needs to run once per nft
    async function addSupportedNft(nftAddress, nftMetadataAddress){
      console.log("attempting to add supported nft...");
       await nftSwap.enableSupportedNftAddress(nftAddress, nftMetadataAddress, {from: owner})
        .catch(console.error);
      console.log(`${nftAddress} nft address added with \nmetadata verifier at ${nftMetadataAddress}`);
    }

    // change the fee rate
    async function setFee(feeRate){
      console.log("attempting to set fee rate...");
      await nftSwap.setFee(feeRate, {from: owner});
      console.log(`feeRate was set to ${parseInt(feeRate)}`);
    }


}.bind(this);
