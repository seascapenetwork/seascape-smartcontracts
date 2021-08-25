let NftStaking = artifacts.require("NftStaking");
let Nft = artifacts.require("SeascapeNft");

let accounts;



/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    const networkId = await web3.eth.net.getId();
    let res = await init(networkId);

    console.log("Depositing...!");

    callback(null, res);
};

let init = async function(networkId) {
    accounts = await web3.eth.getAccounts();

    let nftStaking = await NftStaking.at("0x9CB160C1b80C2915b3833Bf71b7913FC785150dB");
    let nft = await Nft.at("0x9ceAB9b5530762DE5409F2715e85663405129e54");

    let lastSessionId = await nftStaking.lastSessionId();
    lastSessionId = parseInt(lastSessionId);
    console.log("last session id: " , lastSessionId);

    let res = await deposit(nftStaking, nft, lastSessionId);
}.bind(this);


let deposit = async function(nftStaking, nft, lastSessionId) {

//
//     //should approve nft rush to spend cws of player
//     await approve(nft, player, nftStaking.address);
//
//     // nft to deposit


    console.log(`Fetching the nft Id:`);
      let walletAddress = accounts[0];
      let nftId = await nft.tokenOfOwnerByIndex(walletAddress, 0).catch(console.error);
      nftId = parseInt(nftId.toString());
      console.log(`${walletAddress} nft at first index has id ${nftId}`);


    let gameOwner = accounts[0];
    let sp = 100;
    console.log("generating signature...");
    let signature = await sign(nftId, sp, gameOwner);
    let slotIndex = 0;

    //ERC721 approve and deposit token to contract
    console.log("attemping to deposit nft...");
    let deposit_res = await nftStaking.deposit(lastSessionId, slotIndex, nftId, sp, signature[0], signature[1], signature[2], {from: walletAddress})
      .catch(console.error);

    console.log(`Deposited NFT ${nftId} at slot index ${slotIndex} successfully.\nTxid: ${deposit_res.tx}`);
}.bind(this);

let approve = async function (nft, walletAddress, nftStakingAddress) {
    // first, checking whether game's smartcontract was approved to manipulate
    // player's nft
    let approved = await nft.isApprovedForAll(walletAddress, nftStakingAddress);
    if (approved) {
	return;
    }

    //if not approved, we approve player

    //approve to manipulate with player's token in smartcontract:
    let res = await nft.setApprovalForAll(nftStakingAddress, true, {from: walletAddress});
    console.log(`Approvement txid: ${res.tx}`);
};






  //digital signature
let sign = async function(nftId, sp, gameOwner) {
    console.log("starting to sign");
    //v, r, s related stuff
    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],[nftId, sp]);

    console.log("halfway signed");
    let data = web3.utils.keccak256(bytes32);
    let hash = await web3.eth.sign(data, gameOwner);

    let r = hash.substr(0,66);
    let s = "0x" + hash.substr(66,64);
    let v = parseInt(hash.substr(130), 16);
    if (v < 27) {
        v += 27;
    }
    console.log("returning values");

    return [v, r, s];
};
