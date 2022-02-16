let Crowns = artifacts.require("CrownsToken");

module.exports = async function(callback) {
    accounts = await web3.eth.getAccounts();
    
    let stakeToken = "0x0233c40a2846C4e662e9fb9B56375Bde4Ac812E6";  // cws, mscp, cwsBnb, mscpBnb
    let stakeNft = "0xD0fA52436046802477E9F8Bc56b9736c7E604797";    // cws, mscp, cwsBnb, mscpBnb

    let challenge1 = "0xf83B434D1F4E8AF406D81fb0655eBDf69fbd6622";  // cws, mscp
    let challenge2 = "0x518B9206F0eb08035d910D501c8e477733970073";  // cws, cwsBnb
    let challenge3 = "0xdE642E960C938a90C0c331Ac971aC402f0eD81A6";  // cwsBnb
    let challenge4 = "0x676bCB7EfC4A4B80d1aFD4Cb79A52c623F641eAc";  // cws
    let challenge5 = "0x9C8D6cC5958B79a7971febcbaA9Fa94F50e86593";  // cws
    let challenge6 = "0x753D3386B4A0b0Ac659B8e6E2b752550dD846B26";  // cws, mscp
    let challenge7 = "0xDB24cDAeeFd1DFF74e947B55cA99e65d76b0886e";  // mscp
    let challenge8 = "0x1869aB1a6e2561b94599bdE4b94D033686b62A4F";  // cws, mscpBnb
    let challenge9 = "0x8DbDdf7f47d50c572183b8BA7A19C03458B47909";  // cws, cwsBnb
    let challenge10 = "0xF33a6D6B9A262A67A6D182884EEC33851e880fC8"; // cws, mscp
    let challenge11 = "0x8d33C791668E6172c9485ff76081713E8ea1d7B0"; // cws, mscp

    let cws = await Crowns.at("0xbcf39F0EDDa668C58371E519AF37CA705f2bFcbd");
    let mscp = await Crowns.at("0x27d72484f1910F5d0226aFA4E03742c9cd2B297a");
    let cwsBnb = await Crowns.at("0x6615CE60D71513aA4849269dD63821D324A23F8C");
    let mscpBnb = await Crowns.at("0x570d59e90616BA3d95a0e64E5894c3A985CAD697");

    let amount = web3.utils.toWei("1000000000");

    console.log(`Approve for Stake Token...`);
    await approve(stakeToken, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Stake Token Approved`);

    console.log(`Approve for Stake Nft...`);
    await approve(stakeNft, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Stake Nft Approved`);

    console.log(`Approve for Challenge 1...`);
    await approve(challenge1, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Challenge 1 Approved`);
    
    console.log(`Approve for Challenge 2...`);
    await approve(challenge2, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Challenge 2 Approved`);

    console.log(`Approve for Challenge 3...`);
    await approve(challenge3, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Challenge 3 Approved`);
    
    console.log(`Approve for Challenge 4...`);
    await approve(challenge4, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Challenge 4 Approved`);

    
    console.log(`Approve for Challenge 5...`);
    await approve(challenge5, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Challenge 5 Approved`);

    
    console.log(`Approve for Challenge 6...`);
    await approve(challenge6, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Challenge 6 Approved`);

    
    console.log(`Approve for Challenge 7...`);
    await approve(challenge7, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Challenge 7 Approved`);

    
    console.log(`Approve for Challenge 8...`);
    await approve(challenge8, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Challenge8 Approved`);

    
    console.log(`Approve for Challenge 9...`);
    await approve(challenge9, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Challenge 9 Approved`);

    
    console.log(`Approve for Challenge 10...`);
    await approve(challenge10, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Challenge 10 Approved`);

    
    console.log(`Approve for Challenge 11...`);
    await approve(challenge11, [cws, mscp, cwsBnb, mscpBnb], amount);
    console.log(`Challenge 11 Approved`);

    callback(null, true);
};

let approve = async function(to, tokens, amount) {
    let from = accounts[0];

    for (var token of tokens) {
        await token.approve(to, amount, {from: from});
        console.log(`\tApproved for ${to}.`);
        await sleep(2000);
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}