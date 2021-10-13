var NftSwap = artifacts.require("./NftSwap.sol");
let ScapeMetadata = artifacts.require("./ScapeMetadata.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Nft = artifacts.require("./SeascapeNft.sol");
var Factory = artifacts.require("./NftFactory.sol");
var SampleERC20Token = artifacts.require("./SampleERC20Token.sol");
let SampleMetadata = artifacts.require("./SampleMetadata.sol")
let SampleNft = artifacts.require("./SampleNft.sol");


const _feeRate = web3.utils.toWei("1", "ether");

                        // fee = _feeRate * 1000
                        // e.g. if _feeRate is set to 1000 than fee will be 1 CWS

module.exports = async function(deployer, network) {
    if (network == "ganache") {
        deployer.deploy(NftSwap, _feeRate, Crowns.address).then(function(){
            console.log("NftSwap contract was deployed at address: "+NftSwap.address);
            console.log("It is using Crowns (CWS) Token at address: "+Crowns.address);
        });

        deployer.deploy(ScapeMetadata).then(function(){
            console.log("ScapeMetadata contract was deployed at address: "+ScapeMetadata.address);
        });

        // deployer.deploy(Nft).then(function(){
        //     console.log("SeascapeNft contract was deployed at address: "+Nft.address);
        // });

        deployer.deploy(SampleERC20Token).then(function(){
            console.log("SampleERC20Token contract was deployed at address: "+SampleERC20Token.address);
        });

        deployer.deploy(SampleMetadata).then(function(){
            console.log("SampleMetadata contract was deployed at address: "+SampleMetadata.address);
        });

        deployer.deploy(SampleNft).then(function(){
            console.log("SampleNft contract was deployed at address: "+SampleNft.address);
        });

    } else if (network == "rinkeby") {
        var crowns = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
		    var nft = "0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a";

        await deployer.deploy(NftSwap, _feeRate, crowns);
        console.log("NftSwap contract was deployed at address: " +NftSwap.address);

        await deployer.deploy(ScapeMetadata);
        console.log("ScapeMetadata contract was deployed at address: " +ScapeMetadata.address);

    } else if (network == "bsctestnet") {
        var crowns = "0x4Ca0ACab9f6B9C084d216F40963c070Eef95033B";
  	    var nft = "0x66638F4970C2ae63773946906922c07a583b6069";

        await deployer.deploy(NftSwap, _feeRate, crowns);
        console.log("NftSwap contract was deployed at address: " +NftSwap.address);

    } else if (network == "moonbase") {
        var crowns = "0x7F8F2A4Ae259B3655539a58636f35DAD0A1D9989";
        var nft = "0xBD29CE50f23e9dcFCfc7c85e3BC0231ab68cbC37";

        await deployer.deploy(NftSwap, _feeRate, crowns);
        console.log("NftSwap contract was deployed at address: " +NftSwap.address);

    } else if (network == "mainnet") {
        var crowns = "0xac0104cca91d167873b8601d2e71eb3d4d8c33e0";
        var nft = "0x828e2cb8d03b52d408895e0844a6268c4c7ef3ad";

        await deployer.deploy(NftSwap, _feeRate, crowns);
        console.log("NftSwap contract was deployed at address: " +NftSwap.address);

    } else if (network == "bsc") {
        var crowns = "0xbcf39F0EDDa668C58371E519AF37CA705f2bFcbd";
        var nft = "0xc54b96b04AA8828b63Cf250408E1084E9F6Ac6c8";

        await deployer.deploy(NftSwap, _feeRate, crowns);
        console.log("NftSwap contract was deployed at address: " +NftSwap.address);
    }

};
