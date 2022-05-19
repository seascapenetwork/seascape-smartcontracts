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

    let nft = await Nft.at("0x14C7C9D806c7fd8c1B45d466B910c6AbF6428F07");

    // return current account and sessionId
    let user = accounts[0];
    console.log(`Using ${user}`);


    // fetch nftIds
    let receiver = "0xBAc0cC03dC049630C25504426263573d373316b2";


      let tokenId = [210, 211, 303, 305, 401, 402, 503, 503];
      for(i = 0; i<tokenId.length; i++){
        console.log(`attempting to withdraw nft id ${tokenId[i]}...`);
        await nft.safeTransferFrom(user, receiver, tokenId[i], {from: user});
        console.log(`${tokenId[i]} was transfered`);
      }




}.bind(this);
