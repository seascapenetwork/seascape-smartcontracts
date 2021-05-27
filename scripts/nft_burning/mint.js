let NftBurning = artifacts.require("NftBurning");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");


let accounts;

module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);
    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();
    console.log(accounts);

    let nftBurning = await NftBurning.at("0x7F3E3aC2ea90E00f46f76Da0FCadE8CE1F05c5e9");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");


    //global variables
    let user = accounts[1];
    let owner = accounts[0];
    let sessionId = 1;
    let quality = 3;
    let depositInt = "1";
    let depositAmount = web3.utils.toWei(depositInt, "ether");


    console.log(`Using ${user}`);

    // fetch nftIds
    // let nftIds = new Array(5);
    // for(let index = 0; index < 5; index++){
    //   let tokenId = await nft.tokenOfOwnerByIndex(user, index);
    //   nftIds[index] = parseInt(tokenId.toString());
    //   //.catch(console.error);
    //   console.log(`Nft at index ${index} of ${user} has id ${nftIds[index]}`);
    // }

    // known nft ids
    let nftIds = [712 ,713, 714, 715, 716];
    console.log(nftIds);

    // approve transfer of nfts
    // await nft.setApprovalForAll(nftBurning.address, true, {from: user})
    //   .catch(console.error);
    // console.log("nftBurning was approved to spend nfts")


    // let approve = async function (nft, walletAddress, nftStakingAddress) {
    //     // first, checking whether game's smartcontract was approved to manipulate
    //     // player's nft
        // let approved = await nft.isApprovedForAll(user, nftBurning.address);
        // console.log(approved);

        // if not approved, we approve player

        // approve to manipulate with player's token in smartcontract:
    //     let res = await nft.setApprovalForAll(nftStakingAddress, true, {from: walletAddress});
    //     console.log(`Approvement txid: ${res.tx}`);
    // };



    //approve transfer of crowns and check allowance
    // await crowns.approve(nftBurning.address, depositAmount, {from:user})
    // .catch(console.error);

    // let allowance = await crowns.allowance(user, nftBurning.address);
    // allowance = parseInt(allowance).toString();
    // allowance = allowance / 1000000000000000000;
    // console.log(`nftBurning was approved to spend ${allowance} crowns`);

    //signature part
    let bytes32 = web3.eth.abi.encodeParameters(
      ["uint256", "uint256", "uint256", "uint256", "uint256"], nftIds);


      let bytes1 = web3.utils.bytesToHex([quality]);
	    let str = bytes32 + bytes1.substr(2);
	    let data = web3.utils.keccak256(str);

      let hash = await web3.eth.sign(data, owner);
      console.log("hash: " ,hash);


      let r = hash.substr(0,66);
      let s = "0x" + hash.substr(66,64);
      let v = parseInt(hash.substr(130), 16);
      if (v < 27) {
        v += 27;
      }



    //mint
    console.log("calling the mint function...");
    let minted = await nftBurning.mint(
        sessionId,
        nftIds,
        quality,
        v,
        r,
        s,
	    {from: user})
      .catch(console.error);
    console.log("New token was minted");


}.bind(this);
