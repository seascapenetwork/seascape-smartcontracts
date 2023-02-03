require('dotenv').config();
let sds = require("sds-cli")

module.exports = async (callback) => {
    let from = config.config.from;
    let network_id = config.config.network_id;
    let group = "mini-game";
    let name = "ScapeForum";

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
            address: "0x031F40ed49047dAfF336aC54372816fE5e724A72",
            txid: "0x66de6924f207c72d1358bd8e9963474fe582e57a1ada7d9a8760d63fa3505daa"
        }
    } else if (network_id == "56") {
        return {
            address: "0x31A5bD03f0583a7F720a6C1b595ec8b052871288",
            txid: "0x4bbb973ffb55584472fee52672c5b5b24c9934e536e917bb9ea014495e871c1f"
        }
    } else if (network_id == "1285") {
        return {
            address: "",
            txid: ""
        }
    } else if (network_id == "1284") {
        return {
            address: "",
            txid: ""
        }
    }

    throw `not found register parameters for network id '${network_id}'`
}