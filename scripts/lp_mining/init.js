let LpMining = artifacts.require("LpMining");
let LpToken = artifacts.require("LpToken");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;
let reward = web3.utils.toWei("1000", "ether");  // cws
let period = 60;
let generation = 1;

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = init(networkId);
    
    callback(null, res);
};

let init = async function(networkId) {
    web3.eth.getAccounts(function(err,res) { accounts = res; });

	let lpMining = await LpMining.at("0x82b6ed562f202E76A5bDBB209e077f4a96bD5605");
	//let factory = await Factory.at("0x3eB88c3F2A719369320D731FbaE062b0f82F22e4");
	//let nft     = await Nft.at("0x66638F4970C2ae63773946906922c07a583b6069");
	let crowns  = await Crowns.at("0xbcf39F0EDDa668C58371E519AF37CA705f2bFcbd");	
    let lpTokenAddress = "0xe67b96a9456e6e623463d022fbb949a3fdd9ed4c";

    //let nftGranted = await nft.setFactory(factory.address);
    //console.log("Nft has been linked to factory: "+nftGranted.tx);

    //await factory.addStaticUser(lpMining.address);
    //console.log("2/2 Staking contract got a permission");
    
    // should transfer reward amount to contract
    await crowns.transfer(lpMining.address, reward, {from: accounts[0]});
    console.log("Crowns for session were transferred to the Lp Mining smartcontract");

    let startTime = Math.floor(new Date().getTime()/1000) + 30;
    await lpMining.startSession(lpTokenAddress, reward, period, startTime, generation);
    console.log("Session started");

    let sessionId = await lpMining.lastSessionIds.call(lpTokenAddress);
    console.log(sessionId +" session id for "+lpTokenAddress);
    
    return true;
}.bind(this);

