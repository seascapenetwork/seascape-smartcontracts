let NftMarket = artifacts.require("NftMarket");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

/*
SCRIPT2
-user2 buys nft id1
-user2 puts nfts id4 and id5 for sale -each for 2CWS
=there should be 4nfts for sale
and one available nft in my nfts section (for user2)
*/

let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = init(networkId);
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let nftMarket = await NftMarket.at("0x02acB12EF7bafE2909707556673755bEff1eC15E");
    let factory = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");

    let user1 = accounts[1];
    let user2 = accounts[2];

    //execute buy
    await nftMarket.buy(0, crowns.address, {from: user2});

    //put nfts for sale
    let price = web3.utils.toWei("2", "ether");
    let startTime = Math.floor(Date.now()/1000) + 3;

    await nft.setApprovalForAll(nftMarket.address, true, {from: user2});
    await nftMarket.startSales(3, price, startTime, crowns.address, {from: user2});
    await nftMarket.startSales(4, price, startTime+2, crowns.address, {from: user2});


}.bind(this);
