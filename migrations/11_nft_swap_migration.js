// var SwapSigner = artifacts.require("./SwapSigner.sol");
// var NftSwap = artifacts.require("./NftSwap.sol");
//
// var Crowns = artifacts.require("./CrownsToken.sol");
// var MscpToken = artifacts.require("./MscpToken.sol");
//
//
// var Nft = artifacts.require("./SeascapeNft.sol");
// var Factory = artifacts.require("./NftFactory.sol");
// var ScapeSwapParams = artifacts.require("./swap_params/ScapeSwapParams.sol");
//
// let CityNft = artifacts.require("./CityNft.sol");
// let CityFactory = artifacts.require("./CityFactory.sol");
// let CitySwapParams = artifacts.require("./swap_params/CitySwapParams.sol");
//
// var RiverboatNft = artifacts.require("./RiverboatNft.sol");
// var RiverboatFactory = artifacts.require("./RiverboatFactory.sol");
// let RiverboatSwapParams = artifacts.require("./swap_params/RiverboatSwapParams.sol");

let WichitaSwapParams = artifacts.require("./swap_params/WichitaSwapParams.sol");
let ZombieFighterSwapParams = artifacts.require("./ZombieFighterSwapParams.sol");
//
// let LighthouseSwapParams = artifacts.require("./swap_params/LighthouseSwapParams.sol");

const _feeRate = web3.utils.toWei("1", "ether");

                        // fee = _feeRate * 1000
                        // e.g. if _feeRate is set to 1000 than fee will be 1 CWS

module.exports = async function(deployer, network) {

    if (network == "ganache") {

        await deployer.deploy(Crowns).then(function(){
          console.log("Crowns deployed on "+Crowns.address);
        });

        // await deployer.deploy(MscpToken).then(function(){
        //   console.log("Mscp token contract was deployed at address: "+MscpToken.address);
        // });

        await deployer.deploy(SwapSigner).then(function(){
            console.log("SwapSigner contract was deployed at address: "+SwapSigner.address);
        });

        await deployer.deploy(NftSwap, _feeRate, Crowns.address, SwapSigner.address).then(function(){
            console.log("NftSwap contract was deployed at address: "+NftSwap.address);
        });

        await deployer.deploy(Nft).then(function(){
          console.log("Seascape Nft deployed on "+Nft.address);
        });

        await deployer.deploy(Factory, Nft.address).then(function(){
          console.log("Nft Factory was deployed at address: "+Factory.address);
        });

        await deployer.deploy(ScapeSwapParams, SwapSigner.address).then(function(){
            console.log("ScapeSwapParams contract was deployed at address: "+ScapeSwapParams.address);
        });

        // await deployer.deploy(CityNft).then(function(){
        //     console.log("CityNft contract was deployed at address: "+CityNft.address);
        // });
        // await deployer.deploy(CityFactory, CityNft.address).then(function(){
        //     console.log("CityFactory contract was deployed at address: "+CityFactory.address);
        // });
        // await deployer.deploy(CitySwapParams, SwapSigner.address).then(function(){
        //     console.log("CitySwapParams contract was deployed at address: "+CitySwapParams.address);
        // });

        await deployer.deploy(RiverboatNft).then(function(){
            console.log("RiverboatNft contract was deployed at address: "+RiverboatNft.address);
        });
        await deployer.deploy(RiverboatFactory, RiverboatNft.address).then(function(){
            console.log("RiverboatFactory contract was deployed at address: "+RiverboatFactory.address);
        });
        await deployer.deploy(RiverboatSwapParams, SwapSigner.address).then(function(){
            console.log("RiverboatSwapParams contract was deployed at address: "+RiverboatSwapParams.address);
        });

        //
        // await deployer.deploy(LighthouseSwapParams).then(function(){
        //     console.log("LighthouseSwapParams contract was deployed at address: "+LighthouseSwapParams.address);
        // });

    } else {
        var crowns = "0xaC0104Cca91D167873B8601d2e71EB3D4D8c33e0";
        var signer ="0xd4d2B5A1065252B59bf2EB08247C5A918A52e98d";

        // await deployer.deploy(SwapSigner).then(function(){
        //     console.log("SwapSigner contract was deployed at address: "+SwapSigner.address);
        // });

        // await deployer.deploy(NftSwap, _feeRate, crowns, signer).then(function(){
        //     console.log("NftSwap contract was deployed at address: "+NftSwap.address);
        // });
        //
        // await deployer.deploy(ScapeSwapParams, signer).then(function(){
        //     console.log("ScapeSwapParams contract was deployed at address: "+ScapeSwapParams.address);
        // });

        // await deployer.deploy(CitySwapParams, signer).then(function(){
        //     console.log("CitySwapParams contract was deployed at address: "+CitySwapParams.address);
        // });
        //
        // await deployer.deploy(LighthouseSwapParams, signer).then(function(){
        //     console.log("LighthouseSwapParams contract was deployed at address: "+LighthouseSwapParams.address);
        // });
        //
        // await deployer.deploy(RiverboatSwapParams, signer).then(function(){
        //     console.log("RiverboatSwapParams contract was deployed at address: "+RiverboatSwapParams.address);
        // });

        await deployer.deploy(WichitaSwapParams, signer).then(function(){
            console.log("WichitaSwapParams contract was deployed at address: "+WichitaSwapParams.address);
        });
        await deployer.deploy(ZombieFighterSwapParams, signer).then(function(){
            console.log("ZombieFighterSwapParams contract was deployed at address: "+ZombieFighterSwapParams.address);
        });

    }


};
