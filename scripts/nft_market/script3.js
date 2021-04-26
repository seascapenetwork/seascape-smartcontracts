let NftMarket = artifacts.require("NftMarket");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

/*
SCRIPT3
-user1 buys nft id4
-user2 canceles sale for nft id5
=there should be 2nfts for sale (id2 and id3)
 and two available in user2 my nfts section (id1 and id5)
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
    let approveAmount = web3.utils.toWei("5", "ether");
    let nftId = 3;

    //approve spending of crowns
    await crowns.approve(nftMarket.address, approveAmount, {from: user1});

    //execute buy
    await nftMarket.buy(nftId, crowns.address, {from: user1});

    //cancel sale
    await nftMarket.cancelSales(4, {from: user2});


}.bind(this);
