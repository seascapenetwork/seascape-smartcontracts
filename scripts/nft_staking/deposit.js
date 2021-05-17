let NftStaking = artifacts.require("NftStaking");
let Crowns = artifacts.require("CrownsToken");
let Nft = artifacts.require("SeascapeNft");
let Factory = artifacts.require("NftFactory");

let accounts;

let depositInt = "5";
let depositAmount = web3.utils.toWei(depositInt, "ether");


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

    let nftStaking = await NftStaking.at("0xa00D12B9f774F0Cd4F6DA48876C686A0C825B3e5");

    let nft     = await Nft.at("0x7115ABcCa5f0702E177f172C1c14b3F686d6A63a");

    let lastSessionId = await nftStaking.lastSessionId();
    console.log(lastSessionId);

    let res = await deposit(nftStaking, nft, lastSessionId);
}.bind(this);


let deposit = async function(nftStaking, nft, lastSessionId) {

//
//     //should approve nft rush to spend cws of player
//     await approve(nft, player, nftStaking.address);
//
//     // nft to deposit
    let walletAddress = "0x5bDed8f6BdAE766C361EDaE25c5DC966BCaF8f43";
    let nftId = await getFirstNft(nft, walletAddress);
//     if (nftId === 0) {
// 	console.error("No Nft was found for wallet address: "+player);
// 	process.exit(1);
//     }
//
//     let gameOwner = accounts[0];
//     let signature = await sign(nftId, sp, gameOwner);
//
//     let slotIndex = 0;
//     let args = process.argv.slice(4);
//     if (args.length == 1) {
// 	slotIndex = parseInt(args[0]);
// 	if (slotIndex < 0 || slotIndex > 2) {
// 	    throw "Slot index should be between 0 and 2";
// 	    process.exit(1);
// 	}
//     }
//
//     console.log(`Nft id: ${nftId} owned by ${player}`);
//
//     //ERC721 approve and deposit token to contract
//     let deposit_res = await nftStaking.deposit(lastSessionId, slotIndex, nftId, sp, signature[0], signature[1], signature[2], {from: player});
//
//     console.log(`Deposited NFT ${nftId} at slot index ${slotIndex} successfully.\nTxid: ${deposit_res.tx}`);
// }.bind(this);
//
// let approve = async function (nft, walletAddress, nftStakingAddress) {
//     // first, checking whether game's smartcontract was approved to manipulate
//     // player's nft
//     let approved = await nft.isApprovedForAll(walletAddress, nftStakingAddress);
//     if (approved) {
// 	return;
//     }

    // if not approved, we approve player

    // approve to manipulate with player's token in smartcontract:
//     let res = await nft.setApprovalForAll(nftStakingAddress, true, {from: walletAddress});
//     console.log(`Approvement txid: ${res.tx}`);
// };






  //digital signature
// let sign = async function(nftId, sp, gameOwner) {
//     let quality = getRandomInt(5) + 1;
//     //v, r, s related stuff
//     let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],[nftId,sp]);
//
//     let data = web3.utils.keccak256(bytes32);
//     let hash = await web3.eth.sign(data, gameOwner);
//
//     let r = hash.substr(0,66);
//     let s = "0x" + hash.substr(66,64);
//     let v = parseInt(hash.substr(130), 16);
//     if (v < 27) {
//         v += 27;
//     }
//     return [v, r, s];
// };





}

/// returns 0, if owner's balance is empty!
let getFirstNft = async function(nft, walletAddress) {
    console.log("getting firstNft");
    let balance = await nft.balanceOf(walletAddress);
    balance = parseInt(balance);
    console.log("balance: ",balance);

    if (balance === 0) {
	return 0;
    }

    // not retuirning first nft
    let nftId = await nft.tokenOfOwnerByIndex(walletAddress, 0);
    nftId = parseInt(nftId);
    let sp = 100;
    let nftStaking = await NftStaking.at("0xa00D12B9f774F0Cd4F6DA48876C686A0C825B3e5");

    console.log("nftId: ",nftId);


    let bytes32 = web3.eth.abi.encodeParameters(["uint256", "uint256"],[nftId,sp]);


    let data = web3.utils.keccak256(bytes32);

    console.log("calling withoutPrefix function");
    let dataFromContract = await nftStaking.returnMessageWithoutPrefix(nftId, sp);
    console.log("from client: ",data);
    console.log("from contract: ",dataFromContract);
    let hash = await web3.eth.sign(data, walletAddress);
    console.log("hash: " ,hash);





    return nftId;
};
