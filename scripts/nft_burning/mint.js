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

    let nftBurning = await NftBurning.at("0x6b536Fa6c542DBFe1E8Eb0b65aB64D50544a6DF3");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");


    //global variables
    let user = accounts[0];
    let sessionId = 1;
    let quality = 3;


    console.log(`Using ${user}`);

    // fetch nftIds
    // let nftIds = new Array(5);
    // for(let index = 0; index <5; index++){
    //   nftIds[index] = await nft.tokenOfOwnerByIndex(user, index)
    //   .catch(console.error);
    //   console.log(`Nft at index ${index} of ${user} has id ${nftIds[index]}`);
    // }


    // approve transfer of nfts
    // await nft.setApprovalForAll(nftBurning.address, true, {from: user})
    //   .catch(console.error);
    // console.log("nftBurning was approved to spend nfts")

    // known nft ids
    let nftIds = [670, 671, 672, 673, 674];
    console.log(nftIds);

    // signature part
    let bytes32 = web3.eth.abi.encodeParameters(
      ["uint256", "uint256", "uint256", "uint256", "uint256", "uint8"],
      [nftIds[0], nftIds[1], nftIds[2], nftIds[3], nftIds[4], quality]
    );

    let data = web3.utils.keccak256(bytes32);
    let dataFromContract = await nftBurning.returnMessageWithoutPrefix(
      nftIds[0], nftIds[1], nftIds[2], nftIds[3], nftIds[4], quality);
    console.log("from client: ",data);
    console.log("receipt: ",dataFromContract);
    let hash = await web3.eth.sign(data, user);

    // let r = hash.substr(0,66);
    // let s = "0x" + hash.substr(66,64);
    // let v = parseInt(hash.substr(130), 16);
    // if (v < 27) {
    //   v += 27;
    // }
    //
    // let recoverAddress = await nftBurning.returnSigner(
    //   nftIds[0], nftIds[1], nftIds[2], nftIds[3], nftIds[4], quality, v, r, s);
    // console.log("recoverAddress:");
    // console.log(recoverAddress);
    // console.log(user);


    //console.log("Signature: ",hash);


    // mint
    // let minted = await nftBurning.mint(
    //     sessionId,
    //     nftIds,
    //     quality,
    //     v,
    //     r,
    //     s,
	  //   {from: user})
    //   .catch(console.error);
    // console.log("New token was minted");


}.bind(this);
