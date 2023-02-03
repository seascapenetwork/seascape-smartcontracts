require('dotenv').config();
var Contract = artifacts.require("./CrownsToken.sol");
let sds = require("sds-cli")

module.exports = async (callback) => {
    let from = config.config.from;
    let network_id = config.config.network_id;
    let group = "ERC20";
    let name = "CrownsToken";

    let smartcontract = new sds.Smartcontract(group, name);

    // If the smartcontract was deployed, then register the smartcontract in the SeascapeSDS
    params = get_params(network_id.toString())
    await smartcontract.registerInTruffle(params.address, params.txid, web3, from, Contract).catch();

    callback();
}

function get_params(network_id) {
    if (network_id === "1") {
        return {
            address: "0xac0104cca91d167873b8601d2e71eb3d4d8c33e0",
            txid: "0x0dbb1f94d105238878d998f2465e4fb0039b09addb5ad3b114cd120d8688da68"
        }
    } else if (network_id == "56") {
        return {
            address: "0xbcf39F0EDDa668C58371E519AF37CA705f2bFcbd",
            txid: "0xb530829fd65d2f872d2dc60a014c381a5ca618e4684cfe031d924d14843687e3"
        }
    } else if (network_id == "1285") {
        return {
            address: "0x6fc9651f45B262AE6338a701D563Ab118B1eC0Ce",
            txid: "0xa1dcab130bdf3ea80dfb47f741843dbae3911ac04ab78bcbc3d2006673d36a45"
        }
    } else if (network_id == "1284") {
        return {
            address: "0x1aBB8FdE5e64be3419FceF80df335C68dD2956C7",
            txid: "0xa1017cd9d8fab04a710d5b73a5f85a113c15eaeb0118031151fb2bbbc4d54d88"
        }
    }

    throw `not found register parameters for network id '${network_id}'`
}