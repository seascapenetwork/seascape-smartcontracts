require('dotenv').config();
var ScapeStore = artifacts.require("./NftMarket.sol");
let sds = require("sds-cli")

module.exports = async (callback) => {
    let from = config.config.from;
    let group = "marketplace";
    let name = "ScapeStore";

    let smartcontract = new sds.Smartcontract(group, name);

    // If the smartcontract was deployed, then register the smartcontract in the SeascapeSDS
    let address = "0xd8ceF62B7c8C803b29A825515D0c58aA053D3f59";
    let txid = "0xbf79768c08d5cfbe6715253e7b73b135f9ef30495cbf974ff5c76ffd1e6fd3de";
    await smartcontract.registerInTruffle(address, txid, web3, from, ScapeStore).catch();

    callback();
}
