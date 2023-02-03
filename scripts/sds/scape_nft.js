require('dotenv').config();
let sds = require("sds-cli")

module.exports = async (callback) => {
    let from = config.config.from;
    let network_id = config.config.network_id;
    let group = "nft";
    let name = "SeascapeNft";
    process.env.SDS_PROJECT_NAME = "core";

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
            address: "0x828e2cb8d03b52d408895e0844a6268c4c7ef3ad",
            txid: "0x625c17a3f53f46417ceeb7bd4b2afedc775af75bd8472e2ac055c0f3c3508140"
        }
    } else if (network_id == "56") {
        return {
            address: "0xc54b96b04AA8828b63Cf250408E1084E9F6Ac6c8",
            txid: "0x56ea5116c9cc0ab243040cc8f433b2bb9bcd30a252da14f16fe7aa285df7c79b"
        }
    } else if (network_id == "1285") {
        return {
            address: "0x607cBd90BE76e9602548Fbe63931AbE9E8af8aA7",
            txid: "0x458985529bc9e2011d1f24a77e3422ac6c07042fdd8ba88e8c05f16f63fd5db0"
        }
    } else if (network_id == "1284") {
        return {
            address: "",
            txid: ""
        }
    }

    throw `not found register parameters for network id '${network_id}'`
}