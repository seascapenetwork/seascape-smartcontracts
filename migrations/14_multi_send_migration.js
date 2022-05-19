var MultiSend = artifacts.require("./MultiSend.sol");

var Nft = artifacts.require("./SeascapeNft.sol");
var Factory = artifacts.require("./NftFactory.sol");

// let CityNft = artifacts.require("./CityNft.sol");
// let CityFactory = artifacts.require("./CityFactory.sol");



module.exports = async function(deployer, network) {

    if (network == "ganache") {

        await deployer.deploy(MultiSend).then(function(){
            console.log("MultiSend contract was deployed at address: "+MultiSend.address);
        });

        await deployer.deploy(Nft).then(function(){
          console.log("Seascape Nft deployed on "+Nft.address);
        });

        await deployer.deploy(Factory, Nft.address).then(function(){
          console.log("Nft Factory was deployed at address: "+Factory.address);
        });

        // await deployer.deploy(CityNft).then(function(){
        //     console.log("CityNft contract was deployed at address: "+CityNft.address);
        // });
        // await deployer.deploy(CityFactory, CityNft.address).then(function(){
        //     console.log("CityFactory contract was deployed at address: "+CityFactory.address);
        // });

    } else {

        await deployer.deploy(MultiSend).then(function(){
            console.log("MultiSend contract was deployed at address: "+MultiSend.address);
        });

    }


};
