let NftMarket = artifacts.require("NftMarket");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");


let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let nftMarket = await NftMarket.at("0xd79a536581166551b5a4ded9eAC6822627e755bE");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");


    let user = accounts[0];
    console.log(`Using ${user}`);

    let nftId = await nft.tokenOfOwnerByIndex(user, 0).catch(e => console.error(e));
    console.log(`First nft of ${user} is nft id ${nftId}`);

    let price = web3.utils.toWei("1", "ether");

    //approve transfer of nft
    await nft.setApprovalForAll(nftMarket.address, true, {from: user}).catch(console.error);

    //enable sales (onlyOwner) -only needs to run once per contract
    await nftMarket.setIsStartUserSales(true);

    //put nft for sale
    let onSale = await nftMarket.startSales(nftId, price, crowns.address, {from: user}).catch(e => console.error(e));
    console.log(onSale.tx);
    console.log(`Nft id ${nftId} was put for sale`);

}.bind(this);
