let Nft = artifacts.require("RiverboatNft");


let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let nft = await Nft.at("0x9ceAB9b5530762DE5409F2715e85663405129e54");

    // return current account and sessionId
    let user = accounts[0];
    console.log(`Using ${user}`);


    // fetch nftIds
    let receiver = "0xE71d14a3fA97292BDE885C1D134bE4698e09b3B7";
    let amount = 5;
    console.log(`attempting to send nfts...`);
    for(let index = 0; index < amount; index++){
      let tokenId = await nft.tokenOfOwnerByIndex(user, 0);
      tokenId = parseInt(tokenId.toString());
      await nft.safeTransferFrom(user, receiver, tokenId);

      console.log(`Nft with id ${tokenId} was sent.`);
    }



}.bind(this);
