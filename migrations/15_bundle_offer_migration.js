var BundleOffer = artifacts.require("./BundleOffer.sol");

var Crowns = artifacts.require("./CrownsToken.sol");
var Nft = artifacts.require("./SeascapeNft.sol");
var Factory = artifacts.require("./NftFactory.sol");

async function getAccount(id) {
    let accounts = await web3.eth.getAccounts();
    return accounts[id];
}


const feeRate = 10;	// 1 = 0.1%, 10 = 1%, 100 = 10%

module.exports = async function(deployer, network) {

    if (network == "ganache") {
        var feeReceiver = getAccount(3);

        await deployer.deploy(Crowns).then(function(){
          console.log("Crowns deployed on "+Crowns.address);
        });

        await deployer.deploy(BundleOffer, feeReceiver, feeRate).then(function(){
            console.log("BundleOffer contract was deployed at address: "+BundleOffer.address);
        });

        await deployer.deploy(Nft).then(function(){
          console.log("Seascape Nft deployed on "+Nft.address);
        });

        await deployer.deploy(Factory, Nft.address).then(function(){
          console.log("Nft Factory was deployed at address: "+Factory.address);
        });



    } else {
        var feeReceiver = "0x1aBB8FdE5e64be3419FceF80df335C68dD2956C7";

        await deployer.deploy(BundleOffer, feeReceiver, feeRate).then(function(){
            console.log("BundleOffer contract was deployed at address: "+BundleOffer.address);
    }


};
