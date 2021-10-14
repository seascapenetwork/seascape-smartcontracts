let NftSwap = artifacts.require("NftSwap");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let ScapeMetadata = artifacts.require("ScapeMetadata");


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

    let nftSwap = await NftSwap.at("0x4EcD5b851374186badA70e36Bc6df738F0484Cab");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let scapeMetadata = await ScapeMetadata.at("0x8BDc19BAb95253B5B30D16B9a28E70bAf9e0101A");


    let owner = accounts[0];
    console.log(`Using ${owner}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    let feeRate = web3.utils.toWei("500", "milli");
    let tradeEnabled = false;
    let currencyAddress = crowns.address;
    let nftAddress = nft.address;
    let nftMetadataAddress = scapeMetadata.address;
    let tokensAmount = 2;

    // contract calls
    await addSupportedCurrency();
    await removeSupportedCurrency();
    await addSupportedNft();
    await removeSupportedNft();
    await setMaxOfferedTokens();
    await setMaxRequestedTokens();
    await setFee();
    await enableTrade();

    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // add currency address -only needs to run once per currency
    async function addSupportedCurrency(){
        console.log("attempting to add supported currency...");
        await nftSwap.addSupportedBountyAddresses(currencyAddress, {from: owner})
          .catch(console.error);
        console.log(`${currencyAddress} currency address added`);
    }

    // remove currency address
    async function removeSupportedCurrency(){
        console.log("attempting to remove supported currency...");
        await nftSwap.removeSupportedBountyAddress(currencyAddress, {from: owner})
          .catch(console.error);
        console.log(`${currencyAddress} currency address removed`);
    }

    // add nft address -only needs to run once per nft
    async function addSupportedNft(){
      console.log("attempting to add supported nft...");
      await nftSwap.enableSupportedNftAddress(nftAddress, nftMetadataAddress, {from: owner})
        .catch(console.error);
      console.log(`${nftAddress} nft address added with \nmetadata verifier at ${nftMetadataAddress}`);
    }

    // remove nft address
    async function removeSupportedNft(){
      console.log("attempting to remove supported nft...");
      await nftSwap.enableSupportedNftAddress(nftAddress, nftMetadataAddress, {from: owner})
        .catch(console.error);
      console.log(`${nftAddress} nft address removed with \nmetadata verifier at ${nftMetadataAddress}`);
    }

    // change max amount of tokens seller can offer
    async function setMaxOfferedTokens(){
      console.log("attempting to set max offered tokens...");
      await nftSwap.setOfferedTokensAmount(tokensAmount, {from: owner});
      console.log(`max offeredTokensAmount was set to ${tokensAmount}`);
    }

    // change max amount of tokens seller can request
    async function setMaxRequestedTokens(){
      console.log("attempting to set max requested tokens...");
      await nftSwap.setRequestedTokensAmount(tokensAmount, {from: owner});
      console.log(`max requestedTokensAmount was set to ${tokensAmount}`);
    }

    // change the fee rate
    async function setFee(){
      console.log("attempting to set fee rate...");
      await nftSwap.setFee(feeRate, {from: owner});
      console.log(`feeRate was set to ${parseInt(feeRate)/multiplier} crowns`);
    }

    // enable trade (true/false) -only needs to run once
    async function enableTrade(){
      console.log("attempting to enable trade...");
      await nftSwap.enableTrade(tradeEnabled, {from: owner});
      console.log(`tradeEnabled was set to ${tradeEnabled}`);
    }


}.bind(this);
