require('dotenv').config();
let sds = require("sds-cli")

module.exports = async (callback) => {
    let from = config.config.from;
    let network_id = config.config.network_id;
    let group = "mini-game";
    let name = "StakingSaloon";
    process.env.SDS_PROJECT_NAME = "defi";

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
            address: "0x29b0d9A9A989e4651488D0002ebf79199cE1b7C1",
            txid: "0xe7008aca56a432d6beeecad70dee5a87c65e65fd4fb8b6a1eae56239fe03b0eb"
        }
    } else if (network_id == "56") {
        return {
            address: "0x29b0d9a9a989e4651488d0002ebf79199ce1b7c1",
            txid: "0x3d913049285d3cb612da6d831a92549f4b16e7e725e36af4b2cf335a7bc07c8a"
        }
    } else if (network_id == "1285") {
        return {
            address: "0x1a373c9EAAe4295f32DAa4155025b5aEF6B92Bf6",
            txid: "0xb05c1fe1a4b8211f3f8a78cdfcbb88e978566a5d9226b5aedf3fe47c0668127c"
        }
    } else if (network_id == "1284") {
        return {
            address: "",
            txid: ""
        }
    }

    throw `not found register parameters for network id '${network_id}'`
}