var NftSwap = artifacts.require("./NftSwap.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Nft = artifacts.require("./SeascapeNft.sol");
let ScapeSwapParams = artifacts.require("./ScapeSwapParams.sol");
var Factory = artifacts.require("./NftFactory.sol");



const _feeRate = web3.utils.toWei("1", "ether");

                        // fee = _feeRate * 1000
                        // e.g. if _feeRate is set to 1000 than fee will be 1 CWS

module.exports = function(deployer, network) {
    if (network == "ganache") {
        deployer.deploy(NftSwap, _feeRate, Crowns.address, Nft.address).then(function(){
            console.log("NftSwap contract was deployed at address: "+NftSwap.address);
            console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
            console.log("To trade nfts it is using Scape NFT contract at address: "+Nft.address);
        });

        deployer.deploy(ScapeSwapParams).then(function(){
            console.log("NftSwap contract was deployed at address: "+ScapeSwapParams.address);
        });
    }
};