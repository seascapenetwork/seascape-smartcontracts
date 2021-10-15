let NftSwap = artifacts.require("NftSwap");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let ScapeMetadata = artifacts.require("ScapeMetadata");


// global variables
let accounts;
let multiplier = 1000000000000000000;

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

    let nftSwap       = await NftSwap.at("0x8E61f5028eEA48fdd58FD3809fc2202ABdBDC126");
    let crowns        = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let nft           = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let scapeMetadata = await ScapeMetadata.at("0x8BDc19BAb95253B5B30D16B9a28E70bAf9e0101A");

    let user = accounts[1];
    console.log(`Using ${user}`);

    //--------------------------------------------------
    // Parameters setup
    //--------------------------------------------------

    // enter amounts of offered tokens and requested tokens
    let offeredTokensAmount = 1;
    let requestedTokensAmount = 1;

    // get tokenId and lastOfferId
    let offerId = 1;
    //await getOfferId();
    let tokenIds = await getTokenIds();

    // adjust contents of offeredTokens array and requestedTokenMetadata dynamically,
    // depending on size of offeredTokensAmount and requestedTokensAmount
    let requestedTokenIds = [tokenIds[0], "0", "0", "0", "0"];
    let requestedTokenAddresses = [
      nft.address,
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000"
    ];


    //--------------------------------------------------
    // Function calls
    //--------------------------------------------------

    let sig = await encodeNfts();
    console.log(offerId);
    console.log(requestedTokenIds);
    console.log(requestedTokenAddresses);
    console.log(sig[0]);
    console.log(sig[1]);
    console.log(sig[2]);
    await acceptOffer();

    // --------------------------------------------------
    // External function calls
    // --------------------------------------------------

    // return lastOfferId
    async function getOfferId(){
      let _offerId = await nftSwap.getLastOfferId();
      _offerId = parseInt(_offerId);
      console.log(`Last offer id: ${_offerId}`);
      return _offerId;
    }

    // fetch  token Ids for offeredTokens
    async function getTokenIds(){
      let tokenIds = new Array(requestedTokensAmount);
      for(let index = 0; index < requestedTokensAmount; index++){
        let tokenId = await nft.tokenOfOwnerByIndex(user, index);
        tokenIds[index] = parseInt(tokenId.toString());
        //.catch(console.error);
        console.log(`Nft at index ${index} has id ${tokenIds[index]}`);
      }
      return tokenIds;
    }

    // accept offer
    async function acceptOffer(){
      console.log(`attempting to accept offer id ${offerId}...`);
      let offerAccepted = await nftSwap.acceptOffer(offerId, requestedTokenIds,
        requestedTokenAddresses, sig[0], sig[1], sig[2], {from: user}).catch(console.error);
      console.log(`offer was accepted.`);
    }

    // --------------------------------------------------
    // Internal functions - digital signature part
    // --------------------------------------------------


    // encode requestedToken parameters
    async function encodeNfts(){
      console.log("attempting to encode nfts")
      let v = ["0", "0", "0", "0", "0"];
      let r = ["0x00","0x00","0x00","0x00","0x00"];
      let s = ["0x00","0x00","0x00","0x00","0x00"];

      for(let i = 0; i < requestedTokensAmount; i++){
        let sig = await encodeRequestedNft(offerId, requestedTokenIds[i], requestedTokenAddresses[i]);
        v[i] = sig[0];
        r[i] = sig[1];
        s[i] = sig[2];
      }
      return [v, r, s];
    }

    async function encodeRequestedNft(_offerId, _tokenId, _tokenAddress){
      console.log("attempting to encode nft")

      let bytes32 = web3.eth.abi.encodeParameters(
        ["uint256", "uint256"], [_offerId, _tokenId]);

      let str = bytes32.substr(2) + _tokenAddress + user;
      let data = web3.utils.keccak256(bytes32);
      let hash = await web3.eth.sign(data, user);

      let r = hash.substr(0,66);
      let s = "0x" + hash.substr(66,64);
      let v = parseInt(hash.substr(130), 16);
      if (v < 27) {
          v += 27;
      }

      return [v, r, s];
    }




}.bind(this);
