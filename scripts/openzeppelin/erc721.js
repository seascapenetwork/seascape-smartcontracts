let ERC721 = artifacts.require("ERC721");

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {

    //--------------------------------------------------
    // Accounts and contracts configuration
    //--------------------------------------------------

    let accounts;
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    //contract address that is using ERC721
    let erc721 = await ERC721.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");

    let user = accounts[0];
    console.log(`Using account ${user}`);

    //--------------------------------------------------
    // Parameters setup and function calls
    //--------------------------------------------------

    // parameters
    let owner = "0x67588292e0755160f439af7b00c60f5217cbd3eb";
    let operator = "0xC6EF8A96F20d50E347eD9a1C84142D02b1EFedc0";
    let receiver = "0xC6EF8A96F20d50E347eD9a1C84142D02b1EFedc0";

    let tokenId = 3062;
    let approved = true;
    let index = 0;      // 0 = first item, balanceOf - 1 = last item

    // IERC721Metadata calls
    // await name();
    // await symbol();
    // await tokenURI(tokenId);

    // IERC721 calls
    // await balanceOf(owner);
    // await ownerOf(tokenId);
    // await approve(operator, tokenId);
    // await getApproved(tokenId);
    // await setApprovalForAll(operator, approved);
    // await isApprovedForAll(owner, operator);
    // await safeTransferFrom(owner, receiver, tokenId);

    // IERC721Enumerable calls
    // await totalSupply();
    // await tokenOfOwnerByIndex(owner, index);
    // await tokenByIndex(index);

    // special functions
    await getAllOwnersTokens(owner);
    // await getAllTokenIds();



    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // get token name
    async function name(){
        let name = await erc721.name().catch(console.error);
        console.log(`token name is ${name}`);
    }

    // get token symbol
    async function symbol(){
        let symbol = await erc721.symbol().catch(console.error);
        console.log(`token symbol is ${symbol}`);
    }

    // get URI for token Id
    async function tokenURI(tokenId){
        let tokenURI = await erc721.tokenURI(tokenId).catch(console.error);
        console.log(`token uniform resource identifier is ${tokenURI}`);
    }

    // get amount of tokens in 'owner' wallet
    async function balanceOf(owner){
        let balance = await erc721.balanceOf(owner).catch(console.error);
        console.log(`${owner} owns ${balance} tokens`);
        return balance;
    }

    // get address of 'tokenId' owner
    async function ownerOf(tokenId){
        let owner = await erc721.ownerOf(tokenId).catch(console.error);
        console.log(`owner of ${tokenId} is ${owner}`);
    }

    // give permission to 'operator' to transfer 'tokenId' to another account
    // NOTE caller should be token owner or approved
    async function approve(operator, tokenId){
      console.log("attempting to set approve amount...");
      await erc721.approve(operator, tokenId, {from: user}).catch(console.error);
      console.log(`${operator} was approved to spend token id ${tokenId}`);
    }

    // get approved account for 'tokenId'
    async function getApproved(tokenId){
        let approvedAccount = await erc721.getApproved(tokenId).catch(console.error);
        console.log(`${approvedAccount} can spend token id ${tokenId}`);
    }

    // add or remove `operator` ability to transfer any token owned by the caller.
    // NOTE caller should be token owner
    async function setApprovalForAll(operator, approved){
      console.log("attempting to set approval for all...");
      let transfered = await erc721.setApprovalForAll(operator, approved, {from: user}).catch(console.error);
      console.log(`${operator} was approved to transfer all tokens from ${user} ? ${approved}`);
    }

    // returns true if 'operator' is approved to manage all `owner`s tokens
    async function isApprovedForAll(owner, operator){
      let isApproved = await erc721.isApprovedForAll(owner, operator).catch(console.error);
      console.log(`${operator} is approved to manage all tokens belonging to ${owner} ? ${isApproved}`);
    }

    // safely moves `tokenId` from `owner` to `receiver`.
    // NOTE caller should be owner or approved
    async function safeTransferFrom(owner, receiver, tokenId){
      console.log("attempting to safe transfer token from...");
      await erc721.safeTransferFrom(owner, receiver, tokenId, {from: user}).catch(console.error);
      console.log(`token id ${tokenId} was transfered from ${owner} to ${receiver}`);
    }

    // get total amount of tokens stored by contract
    async function totalSupply(){
      let totalSupply = await erc721.totalSupply().catch(console.error);
      console.log(`total supply of ${erc721.address} token is ${totalSupply}`);
    }

    // get tokenId owned by 'owner' at a given 'index'
    async function tokenOfOwnerByIndex(owner, index){
      let tokenId = await erc721.tokenOfOwnerByIndex(owner, index).catch(console.error);
      console.log(`${owner} owns token at index ${index} with id ${tokenId}`);
      return tokenId;
    }

    // get tokenId at given 'index' of all tokens stored by contract
    async function tokenByIndex(index){
      let tokenId = await erc721.tokenByIndex(index).catch(console.error);
      console.log(`token at index ${index} has id ${tokenId}`);
    }

    // get all the tokenIds owned by 'owner'
    async function getAllOwnersTokens(owner){
      let totalBalance = await balanceOf(owner);
      totalBalance = parseInt(totalBalance);
      let tokenIds = [];
      for(index = 0; index < totalBalance; index++){
        let tokenId = await tokenOfOwnerByIndex(owner, index);
        tokenId = parseInt(tokenId);
        tokenIds.push(tokenId);
      }
      console.log(`${owner} owns ${totalBalance} nfts with ids: ${tokenIds}`)
    }

    // get all the tokenIds in existance
    async function getAllTokenIds(){
      let totalSupply = await totalSupply();
      for(index = 0; index < totalSupply; index++)
        await tokenByIndex(index);
    }


}.bind(this);
