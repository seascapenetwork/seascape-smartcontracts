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

    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");

    // return current account and sessionId
    let user = accounts[0];
    console.log(`Using ${user}`);


    // fetch nftIds
    let receiver = "0xf58Ad9E329F83B43Ba1e41AA8BbCF14CD615a951";
    let amount = 5;
    console.log(`Fetching the nft Ids:`);
    for(let index = 0; index < amount; index++){
      let tokenId = await nft.tokenOfOwnerByIndex(user, 0);
      tokenId = parseInt(tokenId.toString());
      await nft.safeTransferFrom(user, receiver, tokenId);

      console.log(`Nft with id ${tokenId} was sent.`);
    }



}.bind(this);
