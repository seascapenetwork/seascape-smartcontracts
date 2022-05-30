let Nft = artifacts.require("SeascapeNft");
let MultiSend = artifacts.require("MultiSend.sol");

let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {

    //--------------------------------------------------
    // Accounts and contracts configuration
    //--------------------------------------------------

    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let nft = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let multiSend = await MultiSend.at("0xE6732Bb069c51C5BBb0F91f11e668E4DE7E35719");

    // return current account and sessionId
    let sender = accounts[1];
    console.log(`Sender ${sender}`);

    //--------------------------------------------------
    // Parameters setup
    //--------------------------------------------------

    // fetch nftIds
    let receiver = accounts[0];
    let amount = 50;

    let nftIds = await getNftIds(sender, nft, amount);
    let nftAddresses = new Array(amount).fill(nft.address);

    //--------------------------------------------------
    // Function calls
    //--------------------------------------------------

    // await approveNfts();
    await sendNfts();

    // --------------------------------------------------
    // External function calls
    // --------------------------------------------------

    async function sendNfts() {
      console.log(`attempting to send nfts...`);
      await multiSend.sendNfts(amount, receiver, nftAddresses, nftIds, {from: sender});
      console.log(`${amount} nfts sent to ${receiver}`);
    }

    async function getNftIds(sender, nft, amount){
      let nftIds = [];
      for(let index = 0; index < amount; index++){
        let nftId = await nft.tokenOfOwnerByIndex(sender, index);
        console.log(`Nft at index ${index} has id ${nftId}`);
        nftIds[index] = parseInt(nftId);
      }
      console.log(`nftIds: [`+nftIds.join(', ')+`]`);
      return nftIds;
    }

    async function approveNfts(){
      console.log("approving multiSend to spend nfts...")
      await nft.setApprovalForAll(multiSend.address, true, {from: sender})
        .catch(console.error);
      // check if nfts are approved
      console.log("checking if Nfts are approved ?");
      let approved = await nft.isApprovedForAll(sender, multiSend.address);
      console.log(approved);
    }



}.bind(this);
