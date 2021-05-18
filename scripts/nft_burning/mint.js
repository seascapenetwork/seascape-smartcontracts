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

    let nftBurning = await NftBurning.at("0x8E38F57DF5595b506FBfaF8733B7E62E63FB8d39");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");


    //global variables
    let user = accounts[0];
    let sessionId = 1;
    let quality = 3;
    let depositInt = "5";
    let depositAmount = web3.utils.toWei(depositInt, "ether");


    console.log(`Using ${user}`);

    // fetch nftIds
    // let nftIds = new Array(5);
    // for(let index = 0; index <5; index++){
    //   let tokenId = await nft.tokenOfOwnerByIndex(user, index);
    //   nftIds[index] = parseInt(tokenId.toString());
    //   //.catch(console.error);
    //   console.log(`Nft at index ${index} of ${user} has id ${nftIds[index]}`);
    // }

    // known nft ids
    let nftIds = [670 ,671, 672, 673, 674];
    console.log(nftIds);

    //approve transfer of nfts
    await nft.setApprovalForAll(nftBurning.address, true, {from: user})
      .catch(console.error);
    console.log("nftBurning was approved to spend nfts")

    await crowns.approve(nftBurning.address, depositAmount);


    // signature part
    let bytes32 = web3.eth.abi.encodeParameters(
      ["uint256", "uint256", "uint256", "uint256", "uint256"], nftIds);


      let bytes1 = web3.utils.bytesToHex([quality]);
	    let str = bytes32 + bytes1.substr(2);
	    let data = web3.utils.keccak256(str);



    // let dataFromContract = await nftBurning.returnMessageWithoutPrefix(nftIds, quality);
    // console.log("from client: ",data);
    // console.log("from contract: ",dataFromContract);
    let hash = await web3.eth.sign(data, user);
    // console.log("hash: " ,hash);


    let r = hash.substr(0,66);
    let s = "0x" + hash.substr(66,64);
    let v = parseInt(hash.substr(130), 16);
    if (v < 27) {
      v += 27;
    }


    // let recoverAddress = await nftBurning.returnSigner(
    //   nftIds[0], nftIds[1], nftIds[2], nftIds[3], nftIds[4], quality, v, r, s);
    // console.log("recoverAddress:");
    // console.log(recoverAddress);
    // console.log(user);


    //console.log("Signature: ",hash);


    //mint
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
