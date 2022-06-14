let NftSwap = artifacts.require("NftSwap");
let SwapSigner = artifacts.require("SwapSigner");

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

    // let nftSwap = await NftSwap.at("0x4Ea12df41baa97dC9732BA8Ff8DFeAae7FFf9c64");
    let swapSigner = await SwapSigner.at("0x8033ebE98607FD9B596eC0D746ed197Ef3EAE311");

    let owner = accounts[0];
    console.log(`Using account ${owner}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    let feeRate = web3.utils.toWei("1", "ether");
    let tradeEnabled = true;
    let currencyAddress = "0x0000000000000000000000000000000000000000";
    let nftAddress = "0xDFd013B8644f30C1b06a3027dD1e8c71De92e056";
    let swapParamsAddress = "0xAfBa60dc55D3ae49933e53d10A689ee940056dbA";
    let tokensAmount = 3;

    let signerAddress = "0xD6d64bb1D3B892Fc25c10DED83dCfA363a9B1b2c";

    // nftSwap calls
    // await addSupportedCurrency(currencyAddress);
    // await removeSupportedCurrency(currencyAddress);
    // await addSupportedNft(nftAddress, swapParamsAddress);
    // await disableSupportedNft(nftAddress, swapParamsAddress);
    // await setFee(feeRate);
    // await enableTrade(tradeEnabled);
    // await getSupportedNftSwapParams(nftAddress);

    await setSigner(signerAddress);

    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // add currency address -only needs to run once per currency
    async function getSupportedNftSwapParams(nftAddress){
        let swapParams = await nftSwap.supportedNftAddresses(nftAddress).catch(console.error);
        if(swapParams != "0x0000000000000000000000000000000000000000")
          console.log(`${nftAddress} uses swapParams address at: ${swapParams}`);
        else
          console.log(`nft address ${nftAddress} not supported`);
    }

    // add currency address -only needs to run once per currency
    async function addSupportedCurrency(currencyAddress){
        console.log("attempting to add supported currency...");
        await nftSwap.addSupportedBountyAddress(currencyAddress, {from: owner})
          .catch(console.error);
        console.log(`${currencyAddress} currency address added`);
    }

    // remove currency address
    async function removeSupportedCurrency(currencyAddress){
        console.log("attempting to remove supported currency...");
        await nftSwap.removeSupportedBountyAddress(currencyAddress, {from: owner})
          .catch(console.error);
        console.log(`${currencyAddress} currency address removed`);
    }

    // add nft address -only needs to run once per nft
    async function addSupportedNft(nftAddress, swapParamsAddress){
      console.log("attempting to add supported nft...");
      await nftSwap.enableSupportedNftAddress(nftAddress, swapParamsAddress, {from: owner})
        .catch(console.error);
      console.log(`${nftAddress} nft address added with \nparams verifier at ${swapParamsAddress}`);
    }

    // remove nft address
    async function disableSupportedNft(nftAddress, swapParamsAddress){
      console.log("attempting to remove supported nft...");
      await nftSwap.disableSupportedNftAddress(nftAddress, {from: owner})
        .catch(console.error);
      console.log(`${nftAddress} nft address removed with \nparams verifier at ${swapParamsAddress}`);
    }

    // change the fee rate
    async function setFee(feeRate){
      console.log("attempting to set fee rate...");
      await nftSwap.setFee(feeRate, {from: owner});
      console.log(`feeRate was set to ${parseInt(feeRate)/multiplier} crowns`);
    }

    // enable trade (true/false) -only needs to run once
    async function enableTrade(tradeEnabled){
      console.log("attempting to enable trade...");
      await nftSwap.enableTrade(tradeEnabled, {from: owner});
      console.log(`tradeEnabled was set to ${tradeEnabled}`);
    }

    // change signer address
    async function setSigner(signerAddress){
        let currentSigner = await swapSigner.getSigner()
        if(signerAddress == currentSigner){
          console.log(`${currentSigner} is current signer`);
        } else {
          console.log("attempting to set signer address...");
          await swapSigner.setSigner(signerAddress, {from: owner})
            .catch(console.error);
          console.log(`${signerAddress} is the new signer`);
        }
    }


}.bind(this);
