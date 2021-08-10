var ProfitCircus = artifacts.require("./ProfitCircus.sol");
var Crowns = artifacts.require("./CrownsToken.sol");
var NftFactory = artifacts.require("./NftFactory.sol");

module.exports = async function(deployer, network) {
	let crowns;
	let factory;

    if (network == "development") {
		crowns = Crowns.address;
		factory = NftFactory.address;
    } else if (network == "rinkeby") {
		crowns = "0x168840df293413a930d3d40bab6e1cd8f406719d";
		factory = "0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0";
	} else if (network == 'mainnet') {
		crowns = "0xac0104cca91d167873b8601d2e71eb3d4d8c33e0";
		factory = "0x25F4C38FAF75dF9622FECB17Fa830278cd732091";
	} else if (network == 'bsc') {
		crowns = "0xbcf39F0EDDa668C58371E519AF37CA705f2bFcbd";
		factory = "0xa304D289f6d0a30aEB33e9243f47Efa3a9ad437d";
    } else if (network == 'bsctestnet') {
		// bsc-testnet
		crowns = "0x4Ca0ACab9f6B9C084d216F40963c070Eef95033B";
		factory = "0x3eB88c3F2A719369320D731FbaE062b0f82F22e4";
	} else {
		throw `${network} is not supported`;
	}

	deployer.deploy(ProfitCircus, crowns, factory)
	.then(() => {
		console.log("Profit Circus smartcontract was deployed at address: "+ProfitCircus.address);
		console.log("Now call, scripts/lp_mining/init.js with uncommenting nftFactory.addStaticUser(profitCircus.address)");
	});
};
