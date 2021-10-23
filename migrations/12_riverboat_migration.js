var Riverboat = artifacts.require("./Riverboat.sol");
var RiverboatNft = artifacts.require("./RiverboatNft.sol");
var RiverboatFactory = artifacts.require("./NftRiverboatFactory.sol");



const _priceReceiver = async function getAccount(id) {
    let accounts = await web3.eth.getAccounts();
    return accounts[id];
}
const _priceReceiver= getAccount(0)
console.log(_priceReceiver)
                        // fee = _feeRate * 1000
                        // e.g. if _feeRate is set to 1000 than fee will be 1 CWS

module.exports = async function(deployer, network) {
    if (network == "ganache") {
        deployer.deploy(Riverboat, _priceReceiver.then(function(){
            console.log("Riverboat contract was deployed at address: "+Riverboat.address);
            console.log("It is using Crowns (CWS) Token at address: "+Crowns.address);
        });
        deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        deployer.deploy(RiverboatFactory, RiverboatNft.address).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });

    } else if (network == "rinkeby") {
        var _RiverboatNft = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
        deployer.deploy(Riverboat, _priceReceiver.then(function(){
            console.log("Riverboat contract was deployed at address: "+Riverboat.address);
            console.log("It is using Crowns (CWS) Token at address: "+Crowns.address);
        });
        deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        deployer.deploy(RiverboatFactory, _RiverboatNft).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });

    } else if (network == "bsctestnet") {
        var _RiverboatNft = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
        deployer.deploy(Riverboat, _priceReceiver.then(function(){
            console.log("Riverboat contract was deployed at address: "+Riverboat.address);
            console.log("It is using Crowns (CWS) Token at address: "+Crowns.address);
        });
        deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        deployer.deploy(RiverboatFactory, _RiverboatNft).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });
        
    } else if (network == "moonbase") {
        var _RiverboatNft = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";

        deployer.deploy(Riverboat, _priceReceiver.then(function(){
            console.log("Riverboat contract was deployed at address: "+Riverboat.address);
            console.log("It is using Crowns (CWS) Token at address: "+Crowns.address);
        });
        deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        deployer.deploy(RiverboatFactory, _RiverboatNft).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });

    } else if (network == "mainnet") {
        var _RiverboatNft = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
        deployer.deploy(Riverboat, _priceReceiver.then(function(){
            console.log("Riverboat contract was deployed at address: "+Riverboat.address);
            console.log("It is using Crowns (CWS) Token at address: "+Crowns.address);
        });
        deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        deployer.deploy(RiverboatFactory, _RiverboatNft).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });

    } else if (network == "bsc") {
        var _RiverboatNft = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
        deployer.deploy(Riverboat, _priceReceiver.then(function(){
            console.log("Riverboat contract was deployed at address: "+Riverboat.address);
            console.log("It is using Crowns (CWS) Token at address: "+Crowns.address);
        });
        deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        deployer.deploy(RiverboatFactory, _RiverboatNft).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });
    }
};
