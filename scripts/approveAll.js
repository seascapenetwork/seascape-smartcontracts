let Nft = artifacts.require("SeascapeNft");

module.exports = async function(callback) {
    accounts = await web3.eth.getAccounts();

    let stakeNft = "0xD0fA52436046802477E9F8Bc56b9736c7E604797";    // cws, mscp, cwsBnb, mscpBnb

    let scape = await Nft.at("0xc54b96b04AA8828b63Cf250408E1084E9F6Ac6c8");
    let wichita = await Nft.at("0x201d44a50604e0fcc3b4a47c2b60e01f00bb47dc");

    console.log(`Approve for Stake Nft...`);
    await approveAll(stakeNft, [scape, wichita]);
    console.log(`Stake Nft Approved`);

    callback(null, true);
};

let approveAll = async function(to, tokens) {
    let from = accounts[0];

    for (var token of tokens) {
        await token.setApprovalForAll(to, true, {from: from});
        console.log(`\tApproved for ${to}.`);
        await sleep(2000);
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}