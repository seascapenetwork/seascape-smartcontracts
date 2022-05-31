let Crowns = artifacts.require("CrownsToken");

module.exports = async function(callback) {
    let res = await init();

    callback(null, res);
};

let init = async function() {
    let crowns = await Crowns.at("0x6fc9651f45B262AE6338a701D563Ab118B1eC0Ce");
    let bridge    = "0x48A6fd66512D45006FC0426576c264D03Dfda304";

    let bridgeAllowed = await crowns.bridgeAllowed().catch(console.error);
    let bridged = await crowns.bridges(bridge).catch(console.error);
    
    console.log(`Was the bridge has permission to bridge? ${bridged}, ${bridgeAllowed}`);
};
