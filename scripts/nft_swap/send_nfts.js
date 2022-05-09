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

    let nft = await Nft.at("0xb807A3F0AF8dD50725DB01d0723930bB0DB9837f");

    // return current account and sessionId
    let user = accounts[0];
    console.log(`Using ${user}`);


    // fetch nftIds
    let receiver = "0x948962dbc28B7f83fBFd5Ae9812c7a1c94E00E30";
    let amount = 8;
    console.log(`attempting to send nfts...`);
    for(let index = 0; index < amount; index++){
      let tokenId = await nft.tokenOfOwnerByIndex(user, 0).catch(console.error);
      tokenId = parseInt(tokenId.toString());
      await nft.transferFrom(user, receiver, tokenId);

      console.log(`Nft with id ${tokenId} was sent.`);
    }



}.bind(this);
