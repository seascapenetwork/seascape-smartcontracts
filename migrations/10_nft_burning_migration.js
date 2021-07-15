var NftBurning = artifacts.require("./NftBurning.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var Factory = artifacts.require("./NftFactory.sol");
var Nft = artifacts.require("./SeascapeNft.sol");

module.exports = async function(deployer, network) {
    if (network == "ganache") {
		await deployer.deploy(Nft);
		console.log("To mint Nft it is using NFT Factory at address: "+Nft.address);
		
        await deployer.deploy(Crowns);
		console.log("It is used with Crowns (CWS) Token at address: "+Crowns.address);
		
        await deployer.deploy(Factory, Nft.address);
        console.log("It is used with NFT Factory at address: "+Factory.address);
		
        await deployer.deploy(NftBurning, Crowns.address, Factory.address, Nft.address);
		console.log("NftBurning contract was deployed at address: "+NftBurning.address);
    }
    else if (network == "rinkeby") {
        var crowns = "0x168840Df293413A930d3D40baB6e1Cd8F406719D";
		var factory = "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0";
		var nft = "0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a";

        await deployer.deploy(NftBurning, crowns, factory, nft);
        console.log("NftBurning contract was deployed at address: "+NftBurning.address);
    }
    else if (network == "bsctestnet") {
        var crowns = "0x4Ca0ACab9f6B9C084d216F40963c070Eef95033B";
        var factory = "0x3eB88c3F2A719369320D731FbaE062b0f82F22e4";
        var nft = "0x66638F4970C2ae63773946906922c07a583b6069";

        await deployer.deploy(NftBurning, crowns, factory, nft);
        console.log("NftBurning contract was deployed at address: "+NftBurning.address);
    }
    else if (network == "moonbase") {
        var crowns = "0x7F8F2A4Ae259B3655539a58636f35DAD0A1D9989";
        var factory = "0xa6c50A865bCC3A3353bFA4B03Bd42C85D4446cD2";
        var nft = "0xBD29CE50f23e9dcFCfc7c85e3BC0231ab68cbC37";

        await deployer.deploy(NftBurning, crowns, factory, nft);
        console.log("NftBurning contract was deployed at address: "+NftBurning.address);
    } else if (network == "mainnet") {
        var crowns = "0xac0104cca91d167873b8601d2e71eb3d4d8c33e0";
        var factory = "0x25F4C38FAF75dF9622FECB17Fa830278cd732091";
        var nft = "0x828e2cb8d03b52d408895e0844a6268c4c7ef3ad";

        await deployer.deploy(NftBurning, crowns, factory, nft);
        console.log("NftBurning contract was deployed at address: "+NftBurning.address);
    } else if (network == "bsc") {
        var crowns = "0xbcf39F0EDDa668C58371E519AF37CA705f2bFcbd";
        var factory = "0xa304D289f6d0a30aEB33e9243f47Efa3a9ad437d";
        var nft = "0xc54b96b04AA8828b63Cf250408E1084E9F6Ac6c8";

        await deployer.deploy(NftBurning, crowns, factory, nft);
        console.log("NftBurning contract was deployed at address: "+NftBurning.address);
    }
};
