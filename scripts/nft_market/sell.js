let NftMarket = artifacts.require("NftMarket");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");


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
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");



    let user = accounts[1];
    let nftId = 0;
    let price = web3.utils.toWei("1", "ether");
    let startTime = Math.floor(Date.now()/1000) + 3;

    //approve transfer of nft
    await nft.setApprovalForAll(nftMarket.address, true, {from: user});

    //enable sales (onlyOwner)
    await nftMarket.setIsStartUserSales(true);

    //put nft for sale
    let onSale = await nftMarket.startSales(nftId, price, startTime, crowns.address, {from: user});
    console.log(onSale);

}.bind(this);
