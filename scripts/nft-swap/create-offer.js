let NftSwap = artifacts.require("NftSwap");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");


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

    let nftSwap       = await NftSwap.at("0x6bC9898490fbe3798CCc085DeF73643000Ab09aB");
    let crowns        = await Crowns.at("0xbcf39F0EDDa668C58371E519AF37CA705f2bFcbd");
    let nft           = await Nft.at("0xc54b96b04AA8828b63Cf250408E1084E9F6Ac6c8");

    let user = accounts[0];
    let owner =  accounts[1];
    console.log(`Using account ${user}`);

    //--------------------------------------------------
    // Parameters setup
    //--------------------------------------------------

    // enter amounts of offered tokens and requested tokens
    let offeredTokensAmount = 1;
    let requestedTokensAmount = 1;

    // get tokenId and lastOfferId
    let offerId = 0;
    // let offerId = await getOfferId();
    // let tokenIds = await getTokenIds();
    let tokenIds = [114400];

    let feeValue = "10";
    let bountyValue = "0";
    let fee = web3.utils.toWei(feeValue, "ether");
    let bounty = web3.utils.toWei(bountyValue, "ether");

    // set the bounty address if bountyValue > 0
    let bountyAddress = "0x0000000000000000000000000000000000000000";            // address must be supported by nftSwap
    // adjust contents of offeredTokens array relative to size of offeredTokensAmount
    let offeredTokensArray = [                            // this array must contain sample data for empty slots
      // structure: [nftId, nftAddress]
      [tokenIds[0], nft.address],
      ["0", "0x0000000000000000000000000000000000000000"],
      ["0", "0x0000000000000000000000000000000000000000"],
      ["0", "0x0000000000000000000000000000000000000000"],
      ["0", "0x0000000000000000000000000000000000000000"],
    ];
    let requestedTokensArray = [                          // this array must contain sample data for empty slots
      // fixed sample data - do not change it
      [nft.address, "0x00", "0", "0x00", "0x00"],
      [nft.address, "0x00", "0", "0x00", "0x00"],
      [nft.address, "0x00", "0", "0x00", "0x00"],
      [nft.address, "0x00", "0", "0x00", "0x00"],
      [nft.address, "0x00", "0", "0x00", "0x00"],
    ];
    // adjust contents of requestedTokenMetadata array relative to size of requestedTokensAmount
    let requestedTokenMetadata = [
      //structure: [tokenAddress, imgId, generation, quality]
      [nft.address, "1", "0", "1"],
      [null], [null], [null], [null]
    ];

    //--------------------------------------------------
    // Function calls
    //--------------------------------------------------

    await signNfts();
      // if(feeValue>0)
      //   await approveCrowns();
      // if(bountyValue > 0 && bountyAddress != crowns.address && bountyAddress != "0x0000000000000000000000000000000000000000")
      //   await approveBounty();
      // await approveNfts();
    printParams();
    // await createOffer();

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

      let tokenIds = new Array(offeredTokensAmount);
      for(let index = 0; index < offeredTokensAmount; index++){
        let tokenId = await nft.tokenOfOwnerByIndex(user, index);
        tokenIds[index] = parseInt(tokenId.toString());
        //.catch(console.error);
        console.log(`nft at index ${index} has id ${tokenIds[index]}`);
      }
      return tokenIds;
    }

    // approve crowns and check allowance
    async function approveCrowns(){
      console.log("attemping to approve crowns...");
      if(bountyValue > 0 && bountyAddress == crowns.address)
          fee = web3.utils.toWei((feeValue + bountyValue).toString(), nomination);
      await crowns.approve(nftSwap.address, fee, {from: user});
      console.log("checking allowance");
      let allowance = await crowns.allowance(user, nftSwap.address);
      allowance = allowance.toString();
      console.log(`nftSwap was approved to spend ${allowance/multiplier} crowns`);
    }

    // approve bounty and check allowance
    async function approveBounty(){
      console.log("attemping to approve bounty...");
      await crowns.approve(bountyAddress, bounty, {from: user});
      console.log("checking allowance");
      let allowance = await bountyAddress.allowance(user, nftSwap.address);
      allowance = allowance.toString();
      console.log(`nftSwap was approved to spend ${allowance/multiplier} bounty`);
    }

    // approve transfer of nfts
    async function approveNfts(){
      console.log("approving nftSwap to spend nfts...")
      await nft.setApprovalForAll(nftSwap.address, true, {from: user})
        .catch(console.error);
      // check if nfts are approved
      console.log("checking if Nfts are approved ?");
      let approved = await nft.isApprovedForAll(user, nftSwap.address);
      console.log(approved);
    }

    // create offer
    async function createOffer(){
      console.log("attempting to create new offer...");
      let offerCreated = await nftSwap.createOffer(offeredTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress, {from: user, value: bounty}).catch(console.error);
      console.log(`offer id ${offerId+1} was created.`);
    }

    function printParams(){
      console.log("offeredTokensAmount", offeredTokensAmount);
      console.log("offeredTokensArray", offeredTokensArray);
      console.log("requestedTokensAmount", requestedTokensAmount);
      console.log("requestedTokensArray", requestedTokensArray);
      console.log("bounty", bounty);
      console.log("bountyAddress", bountyAddress);
    }

    // --------------------------------------------------
    // Internal functions - digital signature part
    // --------------------------------------------------

    // encode requestedToken metadata
    async function signNfts(){
      for(let i = 0; i < requestedTokensAmount; i++){
        console.log("Requested tokens metadata:")
        console.log(`token at index ${i} nftAddress: ${requestedTokenMetadata[i][0]} imgId: ${requestedTokenMetadata[i][1]} generation: ${requestedTokenMetadata[i][2]} quality: ${requestedTokenMetadata[i][3]}`);

        encodedData = encodeNft(requestedTokenMetadata[i][1],
          requestedTokenMetadata[i][2], requestedTokenMetadata[i][3]);

        let sig = await signParams(offerId, encodedData);

        requestedTokensArray[i] = [requestedTokenMetadata[i][0], encodedData, sig[0], sig[1], sig[2]];
      }
      console.log("nfts digital signature created.");
    }

    function encodeNft(_imgId, _gen, _quality) {
      let bytes32 = web3.eth.abi.encodeParameters(
        ["uint256", "uint256", "uint8"], [_imgId, _gen, _quality]);
      return bytes32;
    }

    //digital signatures
    async function signParams(offerId, bytes){
      let bytes32 = web3.eth.abi.encodeParameters(
        ["uint256"], [offerId]);
      let data = web3.utils.keccak256(bytes32 + bytes.substr(2));
      let hash = await web3.eth.sign(data, owner);
      console.log("signed with: ",owner);

      let r = hash.substr(0,66);
      let s = "0x" + hash.substr(66,64);
      let v = parseInt(hash.substr(130), 16);
      if (v < 27) {
          v += 27;
      }

      return [v, r, s];
    }


}.bind(this);
