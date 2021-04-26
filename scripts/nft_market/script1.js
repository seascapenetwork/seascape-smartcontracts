let NftMarket = artifacts.require("NftMarket");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

/*
SCRIPT1
-mint 5 nfts;
 id1,id2,id3 to user1,
 id4, id5 to user2
-put nft id1, id2, id3 for sale (from user1) -each for 1CWS
=there should be 3 nfts for sale in the market
 and 2 nfs available in my nfts section (for user2)
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


    //grant allowance to mint 5 nfts
    web3.eth.getAccounts(function(err,res) {accounts = res;});
    let grantedAcc1 = await factory.isGenerator(user1);
    let grantedAcc2 = await factory.isGenerator(user2);
    if (!grantedAcc1) {
        let res = await factory.addGenerator(user1);
    } else {
	      console.log(`Account ${user1} was already granted a permission`);
    }
    if (!grantedAcc2) {
        let res = await factory.addGenerator(user2);
    } else {
	      console.log(`Account ${user2} was already granted a permission`);
    }

    let generation = 0;
    let quality = 1;

    //mint 3 tokens for user1
    let nft1 = await factory.mintQuality(user1, generation, quality);
    console.log(nft1);
    let nft2 = await factory.mintQuality(user1, generation, quality);
    console.log(nft2);
    let nft3 = await factory.mintQuality(user1, generation, quality);
    console.log(nft3);
    //mint 2 tokens for player2
    let nft4 = await factory.mintQuality(user2, generation, quality);
    console.log(nft4);
    let nft5 = await factory.mintQuality(user2, generation, quality);
    console.log(nft5);


    console.log(await nft.balanceOf(user1));
    console.log(await nft.balanceOf(user2));


    //put 3 nfts for sale(from user1)
    let price = web3.utils.toWei("1", "ether");

    let startTime = Math.floor(Date.now()/1000) + 3;
    await nft.setApprovalForAll(nftMarket.address, true, {from: user1});
    await nftMarket.setIsStartUserSales(true);
    await nftMarket.startSales(0, price, startTime, crowns.address, {from: user1});
    await nftMarket.startSales(1, price, startTime+2, crowns.address, {from: user1});
    await nftMarket.startSales(2, price, startTime+4, crowns.address, {from: user1});

}.bind(this);
