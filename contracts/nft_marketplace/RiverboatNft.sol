pragma solidity 0.6.7;


















struct session
uint256 public startPrice		//nft price in current interval
uint public priceIncrease		//how much nftPrice increase every interval
uint32 startTime			//session start timestamp (max 2106)
uint32 intervalDuration			//duration of single interval – in seconds
uint intervalsTotal			//total of intervals
//instead of intervalsTotal we coule use endTime
//uint32 endTime			//session end timestamp
}

uint currentPrice
uint currentInterval
uint enableTrade

mapping sessons
//ERC721 => metadataCheck
mapping (address=>address) supportedNftSeries

//
function addSupportedNft(address _address) external onlyOwner
	require supportedNftSeries[_address
function startSession(struct session)
require(!isActive(session), "another session already active)
function Buy external (slot index) returns (currentPrice)
emit Buy

function updateCurrentPrice external returns (currentPrice)
	return currentPrice

function enableTrade external returns (tradeEnabled)
	return tradeEnabled

function updateCurrentInterval
function isActive(sessionId) internal view
	sessions[sessionId] = memory session
//reformat following require inside if
require(now <session.startTime + session.intervalDuration * intervalsTotal)


//check that nft at slot is available for sell
function nftAtSlotAvailable internal(uint slotNumber,  ) returns (bool)
	require slotNumber < 5
require
(require nftAtSlot ! sold)
