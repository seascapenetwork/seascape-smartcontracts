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

    let nftSwap = await NftSwap.at("0xa7354413e805458c405aa00A680FDB179AfCedd5");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let scapeMetadata = await ScapeMetadata.at("0x8BDc19BAb95253B5B30D16B9a28E70bAf9e0101A");

    let owner = accounts[0];
    console.log(`Using ${owner}`);

    //--------------------------------------------------
    // Parameters setup
    //--------------------------------------------------

    // get tokenId and lastOfferId
    let tokenId = await getTokenId();
    let offerId = await getOfferId();

    // enter fee and bounty values and desirable nomination (micro/milli/ether/grand...)
    let feeValue = 1;
    let bountyValue = 0;
    let fee = web3.utils.toWei(feeValue.toString(), "ether");
    let bounty = web3.utils.toWei(bountyValue.toString(), "ether");

    // set the bounty address if bountyValue > 0
    let bountyAddress = crowns.address;            // address must be supported by nftSwap

    // enter amounts of offered tokens and requested tokens
    let offerTokensAmount = 1;
    let requestedTokensAmount = 1;

    // adjust contents of offeredTokens array and requestedTokenMetadata dynamically,
    // depending on size of offerTokensAmount and requestedTokensAmount
    let offeredTokensArray = [                            // this array must contain sample data for empty slots
      // structure: [nftId, nftAddress]
      [tokenId, nft.address],
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
    let requestedTokenMetadata = [
      //structure: [tokenAddress, imgId, generation, quality]
      [nft.address, "24", "0", "4"],
      [null], [null], [null], [null]
    ];

    //--------------------------------------------------
    // Function calls
    //--------------------------------------------------

    await signNfts();
    if(feeValue>0)
      await approveCrowns();
    // if(bountyValue>0)
    //   await approveBounty();
    // await approveNfts();
    await createOffer();

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

    // get tokenId at index 0
    async function getTokenId(){
      let _tokenId = await nft.tokenOfOwnerByIndex(owner, 0);
      _tokenId = parseInt(_tokenId.toString());
      console.log(`Token at index 0 has id ${_tokenId}`);
      return _tokenId;
    }

    // approve crowns and check allowance
    async function approveCrowns(){
      console.log("attemping to approve crowns...");
      await crowns.approve(nftSwap.address, fee, {from: owner});
      console.log("checking allowance");
      let allowance = await crowns.allowance(owner, nftSwap.address);
      allowance = allowance.toString();
      console.log(`nftSwap was approved to spend ${allowance/multiplier} crowns`);
    }

    // approve bounty and check allowance
    async function approveBounty(){
      console.log("attemping to approve bounty...");
      await crowns.approve(bountyAddress, bounty, {from: owner});
      console.log("checking allowance");
      let allowance = await bountyAddress.allowance(owner, nftSwap.address);
      allowance = allowance.toString();
      console.log(`nftSwap was approved to spend ${allowance/multiplier} bounty`);
    }

    // approve transfer of nfts
    async function approveNfts(){
      console.log("approving nftSwap to spend nfts...")
      await nft.setApprovalForAll(nftSwap.address, true, {from: owner})
        .catch(console.error);
      // check if nfts are approved
      console.log("Checking if Nfts are approved ?");
      let approved = await nft.isApprovedForAll(owner, nftSwap.address);
      console.log(approved);
    }

    // create offer
    async function createOffer(){
      console.log("attempting to create new offer...");
      let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
        requestedTokensArray, bounty, bountyAddress,  {from: owner}).catch(console.error);
      console.log(`new offer was created.`);
    }

    // --------------------------------------------------
    // Internal functions - digital signature part
    // --------------------------------------------------

    // encode requestedToken metadata
    async function signNfts(){
      for(let i = 0; i < requestedTokensAmount; i++){
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

      let r = hash.substr(0,66);
      let s = "0x" + hash.substr(66,64);
      let v = parseInt(hash.substr(130), 16);
      if (v < 27) {
          v += 27;
      }

      return [v, r, s];
    }


}.bind(this);
