let NftSwap = artifacts.require("NftSwap");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let ScapeMetadata = artifacts.require("ScapeMetadata");



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

    let nftSwap = await NftSwap.at("0xa7354413e805458c405aa00A680FDB179AfCedd5");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");
    let scapeMetadata = await ScapeMetadata.at("0x8BDc19BAb95253B5B30D16B9a28E70bAf9e0101A");


    let owner = accounts[0];
    console.log(`Using ${owner}`);

    //--------------------------------------------------
    // Parameters setup
    //--------------------------------------------------

    let offerId = 2;

    let fee = web3.utils.toWei("100", "milli");
    let tokenId = await nft.tokenOfOwnerByIndex(owner, 0);
    tokenId = parseInt(tokenId.toString());
    console.log(`tokenId: ${tokenId}`);

    let offerTokensAmount = 1;
    let requestedTokensAmount = 1;
    let bounty = web3.utils.toWei("0", "milli");
    let bountyAddress = crowns.address;
    let offeredTokensArray = [                            // this array must contain sample data for empty slots
      // structure: [nftId, nftAddress]
      [tokenId, nft.address],
      ["0", "0x0000000000000000000000000000000000000000"],
      ["0", "0x0000000000000000000000000000000000000000"],
      ["0", "0x0000000000000000000000000000000000000000"],
      ["0", "0x0000000000000000000000000000000000000000"],
    ];
    let requestedTokensArray = [                          // this array must contain sample data for empty slots
      //structure: [tokenAddress, imgId, generation, quality]
      [nft.address, "0x00", "0", "0x00", "0x00"],
      [nft.address, "0x00", "0", "0x00", "0x00"],
      [nft.address, "0x00", "0", "0x00", "0x00"],
      [nft.address, "0x00", "0", "0x00", "0x00"],
      [nft.address, "0x00", "0", "0x00", "0x00"],
    ];
    let requestedTokenMetadata = [
      [nft.address, "24", "0", "4"],
      [null], [null], [null], [null]
    ];

    // encode requestedToken parameters
    for(let i = 0; i < requestedTokensAmount; i++){
      console.log("attemping to encode nfts");
      encodedData = encodeNft(requestedTokenMetadata[i][1],
        requestedTokenMetadata[i][2], requestedTokenMetadata[i][3]);
        console.log("attemping to sign params");
      let sig = await signParams(offerId, encodedData);

      requestedTokensArray[i] = [requestedTokenMetadata[i][0], encodedData, sig[0], sig[1], sig[2]];
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
      console.log("params signed");

      return [v, r, s];
    }


    //--------------------------------------------------
    // Function calls
    //--------------------------------------------------

    // ERC20 approve

    console.log("attemping to approve crowns");
    await crowns.approve(nftSwap.address, fee + bounty, {from: owner});
    console.log("checking allowance");
    let allowance = await crowns.allowance(owner, nftSwap.address);
    console.log(allowance);

    // ERC721 approve

    // approve transfer of nfts
    console.log("approving nftBurning to spend nfts...")
    await nft.setApprovalForAll(nftSwap.address, true, {from: owner})
      .catch(console.error);
    // check if nfts are approved
    console.log("Checking if Nfts are approved ?")
    let approved = await nft.isApprovedForAll(owner, nftSwap.address);
    console.log(approved);


    // contract main function calls
    console.log("attempting to create new offer...");
    let offerCreated = await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
      requestedTokensArray, bounty, bountyAddress,  {from: owner}).catch(console.error);
    console.log(`new offer was created.`);


    //--------------------------------------------------
    // Functions operating the contract
    //--------------------------------------------------

    // enable trade (true/false) -only needs to run once
    // async function createOffer(tradeEnabled){
    //   console.log("attempting to create new offer...");
    //   await nftSwap.createOffer(offerTokensAmount, offeredTokensArray, requestedTokensAmount,
    //     requestedTokensArray, bounty, bountyAddress, {from: owner});
    //   console.log(`new offer was created.`);
    // }

}.bind(this);
