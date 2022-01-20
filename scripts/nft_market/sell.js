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

    let nftMarket = await NftMarket.at("0x93A782FD81444dC3fE2EFB529Dd7a6FB9eef7190");
    let nft     = await Nft.at("0x14C7C9D806c7fd8c1B45d466B910c6AbF6428F07");
    let crowns  = await Crowns.at("0xFde9cad69E98b3Cc8C998a8F2094293cb0bD6911");


    let user = accounts[0];
    console.log(`Using ${user}`);

    // fetch nftId
    let nftId = 39;
    // let nftId = await nft.tokenOfOwnerByIndex(user, 0)
    //   .catch(console.error);
    // console.log(`First nft of ${user} is nft id ${nftId}`);

    // approve transfer of nft
    console.log("attempting to approve nftMarket to spend nfts...")
    await nft.setApprovalForAll(nftMarket.address, true, {from: user})
      .catch(console.error);
    console.log("nftMarket was approved to spend nfts")

    //put nft for sale
    let price = web3.utils.toWei("1", "ether");
    console.log("attempting to put nft for sale...")
    let onSale = await nftMarket.sell(nftId, price, nft.address, crowns.address, {from: user})
      .catch(console.error);
    console.log(onSale.tx);
    console.log(`Nft id ${nftId} was put for sale`);

}.bind(this);
