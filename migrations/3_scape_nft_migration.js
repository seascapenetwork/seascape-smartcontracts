var Nft = artifacts.require("./SeascapeNft.sol");
let seascape = require("seascape");

module.exports = function(deployer) {
    let scapeNft = new seascape.Smartcontract({name: 'scape-nft', group: 'nft', artifact: Nft});
    await scapeNft.deploy(deployer);

    console.log("Seascape Nft deployed on "+Nft.address);
    console.log("Now deploy factory, and add factory as the nft factory");
};
 
