var Crowns = artifacts.require("./CrownsToken.sol");
let seascape = require("seascape");

module.exports = async function(deployer) {
    try {
        let crowns = await deployer.deploy(Crowns);
        console.log("Crowns deployed on "+Crowns.address);
        console.log(Crowns.abi);
        console.log(Crowns.transactionHash);
    } catch (e) {
        console.error(e);
    }
}
