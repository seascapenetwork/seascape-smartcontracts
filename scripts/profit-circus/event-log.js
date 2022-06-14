// please set the following variables by calling init() function
let web3 = null;
let contractAddress = null;

let db = require('./db');
let con;
let getCon = async function() {
	if (!con) {
		con = await db.getConnection();
	}
	
	return con;
}

/**
 * You first need to create a formatting function to pad numbers to two digits…
 **/
 function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 **/
Date.prototype.toMysqlFormat = function() {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};  

let convertToMysqlFormat = function(date) {
    return date.getUTCFullYear() + "-" + twoDigits(1 + date.getUTCMonth()) + "-" + twoDigits(date.getUTCDate()) + " " + twoDigits(date.getUTCHours()) + ":" + twoDigits(date.getUTCMinutes()) + ":" + twoDigits(date.getUTCSeconds());
};  



//////////////////////////////////////////////////////////////////////////////
// 
//  claimed event tracking
//
//////////////////////////////////////////////////////////////////////////////

let decomposeClaim = function(event) {
    nonIndexed = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'uint256'], event.data);

    return {
        txid: event.transactionHash.toLowerCase(),
        blockNumber: event.blockNumber,
        walletAddress: ("0x" + event.topics[2].substr(26)).toLowerCase(),
        sessionId: parseInt(nonIndexed[0]),
        amount: web3.utils.fromWei(nonIndexed[1]),
        time: new Date(nonIndexed[2] * 1000)
    }
};

let isClaimLoggedOnDb = async function(txid) {
    let sql = `SELECT wallet_address FROM profit_circus_claims WHERE txid = '${txid}' `;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                console.error(err);
                reject(false);
            } else {
                let amount = res.length;

                resolve(amount > 0);
            }
        });
    });
}

let logClaimOnDb = async function(params) {
    let sql = `INSERT INTO profit_circus_claims VALUES ('${params.txid}', '${params.blockNumber}', '${params.walletAddress}', '${params.sessionId}', '${params.amount}', '${params.time.toMysqlFormat()}')`;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

let logClaims = async function(fromBlock, toBlock, sessionId) {
    // Claimed(address indexed stakingToken, address indexed owner, uint256 sessionId, uint256 amount, uint256 claimedTime);
    let claimedTopic = "0xd795915374024be1f03204e052bd584b33bb85c9128ede9c54adbe0bbdc22095";

    let events = await web3.eth.getPastLogs({
        address: contractAddress,
        topics: [claimedTopic],
        fromBlock: fromBlock,
        toBlock: toBlock
    })

    console.log(`    Found ${events.length} events of Claim!`);
    for (var i = 0; i<events.length; i++) {
        let event = events[i];

        let params = decomposeClaim(event);

        if (params.sessionId !== sessionId) {
            continue;
        }

        let logged = await isClaimLoggedOnDb(params.txid);
        if (!logged) {
            await logClaimOnDb(params);
        } 
    }
}

let getUserClaimsOnDb = async function(walletAddress, sessionId) {
    let sql = `SELECT * FROM profit_circus_claims WHERE wallet_address = '${walletAddress}'
        AND session_id = '${sessionId}' ORDER BY profit_circus_claims.claim_time ASC`;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}

//////////////////////////////////////////////////////////////////////////////
//
// Withdraw event tracking
//
//////////////////////////////////////////////////////////////////////////////

let decomposeWithdraw = function(event) {
    nonIndexed = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'uint256', 'uint256'], event.data);

    return {
        txid: event.transactionHash.toLowerCase(),
        blockNumber: event.blockNumber,
        walletAddress: ("0x" + event.topics[2].substr(26)).toLowerCase(),
        sessionId: parseInt(nonIndexed[0]),
        amount: web3.utils.fromWei(nonIndexed[1]),
        time: new Date(nonIndexed[2] * 1000)
    }
};

let isWithdrawLoggedOnDb = async function(txid) {
    let sql = `SELECT wallet_address FROM profit_circus_withdraws WHERE txid = '${txid}' `;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                console.error(err);
                reject(false);
            } else {
                let amount = res.length;

                resolve(amount > 0);
            }
        });
    });
}

let logWithdrawOnDb = async function(params) {
    let sql = `INSERT INTO profit_circus_withdraws VALUES 
    ('${params.txid}', '${params.blockNumber}', '${params.walletAddress}', '${params.sessionId}', 
    '${params.amount}', '${params.time.toMysqlFormat()}')`;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

let logWithdraws = async function(fromBlock, toBlock, sessionId) {
    // Claimed(address indexed stakingToken, address indexed owner, uint256 sessionId, uint256 amount, uint256 claimedTime);
    let withdrawnTopic = "0xfabb9e7afa4ef595f60e1ae9041b2b311b4acb27aeaed4b11b6f2abf689af10a";

    let events = await web3.eth.getPastLogs({
        address: contractAddress,
        topics: [withdrawnTopic],
        fromBlock: fromBlock,
        toBlock: toBlock
    })

    console.log(`    Found ${events.length} events of Withdraw!`);
    for (var i = 0; i<events.length; i++) {
        let event = events[i];

        let params = decomposeWithdraw(event);

        if (params.sessionId !== sessionId) {
            continue;
        }

        let logged = await isWithdrawLoggedOnDb(params.txid);
        if (!logged) {
            await logWithdrawOnDb(params);
        } 
    }
}

let getUserWithdrawsOnDb = async function(walletAddress, sessionId) {
    let sql = `SELECT * FROM profit_circus_withdraws WHERE wallet_address = '${walletAddress}'
        AND session_id = '${sessionId}' ORDER BY profit_circus_withdraws.withdraw_time ASC`;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}

//////////////////////////////////////////////////////////////////////////////
//
// Deposit event tracking
//
//////////////////////////////////////////////////////////////////////////////

let decomposeDeposit = function(event) {
    nonIndexed = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'uint256', 'uint256'], event.data);

    return {
        txid: event.transactionHash.toLowerCase(),
        blockNumber: event.blockNumber,
        walletAddress: ("0x" + event.topics[2].substr(26)).toLowerCase(),
        sessionId: parseInt(nonIndexed[0]),
        amount: web3.utils.fromWei(nonIndexed[1]),
        time: new Date(nonIndexed[2] * 1000)
    }
};

let isDepositLoggedOnDb = async function(txid) {
    let sql = `SELECT wallet_address FROM profit_circus_deposits WHERE txid = '${txid}' `;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                console.error(err);
                reject(false);
            } else {
                let amount = res.length;

                resolve(amount > 0);
            }
        });
    });
}

let logDepositOnDb = async function(params) {
    let sql = `INSERT INTO profit_circus_deposits VALUES 
    ('${params.walletAddress}', '${params.txid}', '${params.blockNumber}', 
    '${params.sessionId}', '${params.amount}', '${params.time.toMysqlFormat()}')`;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

let logDeposits = async function(fromBlock, toBlock, sessionId) {
    // Deposited(address indexed stakingToken, address indexed owner, uint256 sessionId, uint256 amount, uint256 startTime, uint256 totalStaked);
    let depositedTopic = "0xf3b2a76575670b4eff5a4ad3639d40d32f7ca987adac169e6f9b89a3ab857d27";

    let events = await web3.eth.getPastLogs({
        address: contractAddress,
        topics: [depositedTopic],
        fromBlock: fromBlock,
        toBlock: toBlock
    })

    console.log(`    Found ${events.length} events of Deposit!`);
    for (var i = 0; i<events.length; i++) {
        let event = events[i];

        let params = decomposeDeposit(event);

        if (params.sessionId !== sessionId) {
            continue;
        }

        let logged = await isDepositLoggedOnDb(params.txid);
        if (!logged) {
            await logDepositOnDb(params);
        } 
    }
}

let getUserDepositsOnDb = async function(walletAddress, sessionId) {
    let sql = `SELECT * FROM profit_circus_deposits WHERE wallet_address = '${walletAddress}'
        AND session_id = '${sessionId}' ORDER BY profit_circus_deposits.deposit_time ASC`;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}

//////////////////////////////////////////////////////////////////////////////
//
// Claimable
//
//////////////////////////////////////////////////////////////////////////////

let truncateClaimablesOnDb = async function() {
    let sql = `TRUNCATE profit_circus_claimables`;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

let logClaimableOnDb = async function(params) {
    let sql = `INSERT INTO profit_circus_claimables VALUES 
    ('${params.walletAddress}', '${params.blockNumber}', '${params.sessionId}', 
    '${params.claimable}', '${params.deposit}', '${convertToMysqlFormat(params.claimedTime)}')`;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

//////////////////////////////////////////////////////////////////////////////
//
// Wallet operation
//
//////////////////////////////////////////////////////////////////////////////
let getWalletAddressesOnDb = async function() {
    let sql = `SELECT count(txid) as deposit_amount, wallet_address FROM profit_circus_deposits GROUP BY wallet_address ORDER BY wallet_address`;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                console.error(err);
                reject(false);
            } else {
                resolve(res);
            }
        });
    });
}

module.exports = {
    init: (_web3, _contractAddress) => { web3 = _web3; contractAddress = _contractAddress; },
    logDeposits: logDeposits,
    logWithdraws: logWithdraws,
    logClaims: logClaims,

    getWalletAddresses: getWalletAddressesOnDb,

    getUserDeposits: getUserDepositsOnDb,
    getUserWithdraws: getUserWithdrawsOnDb,
    getUserClaims: getUserClaimsOnDb,

    truncateClaimables: truncateClaimablesOnDb,
    logClaimable: logClaimableOnDb
}