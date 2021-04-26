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
    let approveAmount = web3.utils.toWei("5", "ether");

    //approve spending of crowns
    await crowns.approve(nftMarket.address, approveAmount, {from: user});

    //execute buy
    let buy = await nftMarket.buy(nftId, crowns.address, {from: user});
    console.log(buy);

}.bind(this);
