let Nft = artifacts.require("ERC721");
let MultiSend = artifacts.require("MultiSend");

let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    //--------------------------------------------------
    // Contracts setup
    //--------------------------------------------------

    let nft = await Nft.at("0xb807A3F0AF8dD50725DB01d0723930bB0DB9837f");
    let multiSend = await MultiSend.at("0xD9B9dC9fE2DEfc87f8d198b25cC8A068Ca45f330");

    //--------------------------------------------------
    // Parameters setup
    //--------------------------------------------------

    let sender = accounts[0];
    let receiver = accounts[1];
    let amount = 2;

    // NOTE if sending nfts with same address (recommended),
    // dont change the following values
    let nftIds = await getNftIds(sender, nft, amount);
    let nftAddresses = new Array(amount).fill(nft);

    //--------------------------------------------------
    // Function calls
    //--------------------------------------------------

    await getNftBalance(nft, sender);
    await getNftBalance(nft, receiver);

    await approveNfts(multiSend.address);
    await sendNfts(amount, receiver, nftAddresses, nftIds, sender);

    // --------------------------------------------------
    // External function calls
    // --------------------------------------------------

    async function getNftBalance(token, owner){
      console.log("Checking nft balance...");
      let balance = parseInt(await token.balanceOf(owner));
      console.log(`${owner} owns ${balance} nfts`);
    }

    async function getNftIds(user, token, amount){
      let nftIds = new Array(amount);
      for(let index = 0; index < amount; index++){
        let tokenId = await nft.tokenOfOwnerByIndex(owner, index).catch(console.error);
        nftIds[index] = parseInt(tokenId);
      }
      return nftIds;
    }

    async function setApprovalForAll(operator){
      console.log("attempting to set approval for all...");
      let approved = await erc721.setApprovalForAll(operator, true, {from: sender}).catch(console.error);
      console.log(`${operator} was approved to transfer all tokens from ${sender} ? ${approved}`);
    }

    async function sendNfts(amount, receiver, nftAddresses, nftIds, sender){
      console.log("attempting to multi send...");
      await multiSend.sendNfts(amount, receiver, nftAddresses, nftIds, {from: sender}).catch(console.error);
      console.log(`${amount} nfts were transfered from ${sender} to ${receiver}`);
    }


}.bind(this);
