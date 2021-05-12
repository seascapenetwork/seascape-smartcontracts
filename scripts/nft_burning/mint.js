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

    let nftBurning = await NftBurning.at("0x099E19a7CD344DF526bC3c7276A7a8E30efe02c0");
    let crowns  = await Crowns.at("0x168840Df293413A930d3D40baB6e1Cd8F406719D");
    let factory  = await Factory.at("0xF06CF016b6DAdED5f676EE6340fc7398CA2142b0");
    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");


    let user = accounts[0];
    console.log(`Using ${user}`);

    // fetch nftIds
    let nftIds = new Array(5);
    for(let index = 0; index <5; index++){
      nftIds[index] = await nft.tokenOfOwnerByIndex(user, index)
      .catch(console.error);
      console.log(`Nft at index ${index} of ${user} has id ${nftIds[index]}`);
    }


    // approve transfer of nfts
    await nft.setApprovalForAll(nftBurning.address, true, {from: user})
      .catch(console.error);
    console.log("nftBurning was approved to spend nfts")


    // signature part
    let addr = user;

    console.log("Parameters: addr, amount, minted time, quality:  ",
        addr, amountWei, mintedTime, quality);
    console.log("Signer: "+addr);

    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],
            [amountWei, mintedTime]);

    let bytes1 = web3.utils.bytesToHex([quality]);
    let str = addr + bytes32.substr(2) + bytes1.substr(2);
    let data = web3.utils.keccak256(str);
    let hash = await web3.eth.sign(data, addr);
    let r = hash.substr(0,66);
    let s = "0x" + hash.substr(66,64);
    let v = parseInt(hash.substr(130), 16);
    if (v < 27) {
      v += 27;
    }
    console.log("Signature: "+hash);


    //mint
    let sessionId = 1;
    let quality = 3; // one week

    let sessionStarted = await nftBurning.mint(
        startTime,
        period,
        generation,
        interval,
        fee,
	    {from: user})
      .catch(console.error);
    console.log("Started a nft burning session");


}.bind(this);
