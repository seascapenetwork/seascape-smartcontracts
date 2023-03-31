var HeroNftSale = artifacts.require("./HeroNftSale.sol");

module.exports = async function(deployer, network) {

    let priceReceiver = "0xC42683813a7dF2Da3c1B09E5a54Ce757BF57a132";
    let nftSender     = "0xE68115E1BE040b78dCe51088e1f0D1296502D884";
    let verifier      = "0x5bDed8f6BdAE766C361EDaE25c5DC966BCaF8f43";

    await deployer.deploy(HeroNftSale, priceReceiver, nftSender, verifier).then(function(){
         console.log("HeroNftSale contract was deployed at address: "+HeroNftSale.address);
    });

};
