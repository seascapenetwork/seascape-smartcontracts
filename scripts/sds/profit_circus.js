require('dotenv').config();
let sds = require("sds-cli")

module.exports = async (callback) => {
    let from = config.config.from;
    let network_id = config.config.network_id;
    let group = "mini-game";
    let name = "ProfitCircus";

    let smartcontract = new sds.Smartcontract(group, name);

    // If the smartcontract was deployed, then register the smartcontract in the SeascapeSDS
    params = get_params(network_id.toString())
    var Contract = artifacts.require(`./${name}.sol`);
    await smartcontract.registerInTruffle(params.address, params.txid, web3, from, Contract).catch();

    callback();
}

function get_params(network_id) {
    if (network_id === "1") {
        return {
            address: "0x885242256456f5edba66e4e01eb298097449a924",
            txid: "0x18f1d05a0d5827a787b3a6d11ea23dd4e8754de5a34248cd3e8b67b50ecf312e"
        }
    } else if (network_id == "56") {
        return {
            address: "0xf1ed430f02a4afe373cb41837797daf76c9dcedb",
            txid: "0x1ca7b0292e7c2ae7bd9cd40e22f1e1bf82ad513b59b7301fd9af9173e4dcc43a"
        }
    } else if (network_id == "1285") {
        return {
            address: "0x805C8922b408234f5208779053D06D7E8A8d74BC",
            txid: "0x0935ebdddd6ba60b89aecd50092eba84556dec49795d6c80973b89f3bec1906c"
        }
    } else if (network_id == "1284") {
        return {
            address: "",
            txid: ""
        }
    }

    throw `not found register parameters for network id '${network_id}'`
}