let NftRush = artifacts.require("NftRush");

let accounts;

/**
 * For test purpose, starts a game session
 */
module.exports = async function(callback) {
    accounts = await web3.eth.getAccounts();

    let nftRush = await NftRush.deployed();

    console.log(`Showing the session data for ${nftRush.address}`);
    
    await showSession(nftRush);    
};

let showSession = async function(nftRush) {
    let lastSessionId = await nftRush.lastSessionId();
    lastSessionId = parseInt(lastSessionId);

    console.log(`Last session id: ${lastSessionId}`);

    if (lastSessionId == 0) {
	return;
    }
    
    let session = await nftRush.sessions(lastSessionId);    
    console.log(`Session #${lastSessionId} data:`);
    console.log("Start time:          "+(new Date(session.startTime.toNumber() * 1000)));
    console.log(`Session period:      ${session.period} seconds`);
    console.log("End time:            "+(new Date((session.startTime.toNumber()+session.period.toNumber()) * 1000)));
    console.log(`Nft unlock interval: ${session.interval} seconds`);
    console.log(`Nft generation:      ${session.generation}`);
};

