require('dotenv').config();
let sds = require("sds-cli")

module.exports = async (callback) => {
    let from = config.config.from;
    let network_id = config.config.network_id;
    let group = "mini-game";
    let name = "NftBrawl";

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
            address: "0xe5bD525aaF599B75362d5b1c78ECCc47266adE47",
            txid: "0xfba41065b0b915449feaab6f309a7cc17676afc6e4e043eb5d5b8cee773819f0"
        }
    } else if (network_id == "56") {
        return {
            address: "0xdb8b1bd9a47443f7e97cccf985f0254b191a84ef",
            txid: "0x965b504ece0602ef64edda262f3eb7c4c1c4a033b7a95041d1412a1579219f6d"
        }
    } else if (network_id == "1285") {
        return {
            address: "0xac011534161c6345cED73d148C24809C3ac6dBb0",
            txid: "0x9cd3fe907eaf5a9d09d7c6f324e5efb145c48e50ae36d4c74151757cd3d9a32b"
        }
    } else if (network_id == "1284") {
        return {
            address: "",
            txid: ""
        }
    }

    throw `not found register parameters for network id '${network_id}'`
}