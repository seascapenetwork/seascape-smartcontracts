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

    let nft     = await Nft.at("0x9ceAB9b5530762DE5409F2715e85663405129e54");

    // return current account and sessionId
    console.log(`Using ${user}`);


    // fetch nftIds
    let receiver = "0x4A88cDd539aED47A08539DAAAB089424F1dd2EeB";
    let amount = 5;
    console.log(`Fetching the nft Ids:`);
    for(let index = 0; index < amount; index++){
      let tokenId = await nft.tokenOfOwnerByIndex(user, index);
      tokenId = parseInt(tokenId.toString());
      await nft.safeTransferFrom(user, receiver, tokenId);

      console.log(`Nft with id ${tokenId} was sent.`);
    }



}.bind(this);
