var Riverboat = artifacts.require("./Riverboat.sol");
var RiverboatNft = artifacts.require("./RiverboatNft.sol");
var RiverboatFactory = artifacts.require("./RiverboatFactory.sol");



async function getAccount(id) {
    let accounts = await web3.eth.getAccounts();
    return accounts[id];
}


module.exports = async function(deployer, network) {
    var priceReceiver = await getAccount(0);

    if (network == "ganache") {
        await deployer.deploy(Riverboat, priceReceiver).then(function(){
            console.log("Riverboat contract was deployed at address: "+Riverboat.address);
        });
        await deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        await deployer.deploy(RiverboatFactory, RiverboatNft.address).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });

    } else if (network == "rinkeby") {
        var _RiverboatNft = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
        deployer.deploy(Riverboat, priceReceiver).then(function(){
            console.log("Riverboat contract was deployed at address: "+Riverboat.address);
        });
        deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        deployer.deploy(RiverboatFactory, _RiverboatNft).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });

    } else if (network == "bsctestnet") {
        var _RiverboatNft = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
        deployer.deploy(Riverboat, priceReceiver).then(function(){
            console.log("Riverboat contract was deployed at address: "+Riverboat.address);
        });
        deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        deployer.deploy(RiverboatFactory, _RiverboatNft).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });

    } else if (network == "moonbase") {
        var _RiverboatNft = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
        deployer.deploy(Riverboat, priceReceiver).then(function(){
            console.log("Riverboat contract was deployed at address: "+Riverboat.address);
        });
        deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        deployer.deploy(RiverboatFactory, _RiverboatNft).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });

    } else if (network == "mainnet") {
        var _RiverboatNft = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
        deployer.deploy(Riverboat, priceReceiver).then(function(){
            console.log("Riverboat contract was deployed at address: "+Riverboat.address);
        });
        deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        deployer.deploy(RiverboatFactory, _RiverboatNft).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });

    } else if (network == "bsc") {
        var _RiverboatNft = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
        deployer.deploy(Riverboat, priceReceiver).then(function(){
            console.log("Riverboat contract was deployed at address: "+Riverboat.address);
        });
        deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        deployer.deploy(RiverboatFactory, _RiverboatNft).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });
    }
};
