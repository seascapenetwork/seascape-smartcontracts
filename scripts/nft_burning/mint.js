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

    let nftBurning = await NftBurning.at("0x3577d8f8cA9BFB1b9ab2d20C572826De1458516f");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");


    // global variables
    let user = accounts[1];
    let owner = accounts[0];
    let quality = 3;
    let depositInt = "1";
    let depositAmount = web3.utils.toWei(depositInt, "ether");
    let imgId = 1;


    // return current account and sessionId
    console.log(`Using ${user}`);
    let sessionId = await nftBurning.lastSessionId.call();
    sessionId = parseInt(sessionId);
    console.log("current session id: " ,sessionId);


    // return user totalStaked balance per sessionId
    let totalStaked = await nftBurning.totalStakedBalanceOf(sessionId, user);
    console.log(`User staked ${totalStaked} in session ${sessionId}`);


    // fetch nftIds
    let nftIds = new Array(5);
    console.log(`Fetching the nft Ids:`);
    for(let index = 0; index < 5; index++){
      let tokenId = await nft.tokenOfOwnerByIndex(user, index);
      nftIds[index] = parseInt(tokenId.toString());
      //.catch(console.error);
      console.log(`Nft at index ${index} has id ${nftIds[index]}`);
    }

    // or set values manually
    // let sessionId = 2;
    // let totalStaked = web3.utils.toWei("0", "milli");
    // let nftIds = [970 ,971, 972, 973, 974];


    // approve transfer of nfts
    console.log("approving nftBurning to spend nfts...")
    await nft.setApprovalForAll(nftBurning.address, true, {from: user})
      .catch(console.error);
    // check if nfts are approved
    console.log("Checking if Nfts are approved ?")
    let approved = await nft.isApprovedForAll(user, nftBurning.address);
    console.log(approved);


    // approve transfer of crowns and check allowance
    console.log("approving nftBurning to spend crowns...")
    await crowns.approve(nftBurning.address, depositAmount, {from:user})
    .catch(console.error);
    console.log("checking if crowns are approved ?")
    let allowance = await crowns.allowance(user, nftBurning.address);
    allowance = parseInt(allowance).toString() / 1000000000000000000;
    console.log(`nftBurning was approved to spend ${allowance} crowns`);


    // signature part
    console.log("generating sig");
    let bytes32 = web3.eth.abi.encodeParameters(
      ["uint256", "uint256", "uint256", "uint256", "uint256", "uint256", "uint256"],
      [nftIds[0], nftIds[1], nftIds[2], nftIds[3], nftIds[4], totalStaked, imgId]);

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


    // mint
    console.log("calling the mint function...");
    let minted = await nftBurning.mint(
        sessionId,
        nftIds,
        quality,
        imgId,
        v,
        r,
        s,
	    {from: user})
      .catch(console.error);
    console.log("New token was minted");


}.bind(this);
