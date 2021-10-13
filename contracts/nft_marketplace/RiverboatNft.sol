pragma solidity 0.6.7;







import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../seascape_nft/SeascapeNft.sol";
import "./../openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./NftSwapParamsInterface.sol";





/// @title RiverboatNft, a nft service platform
/// User can buy nft at a slot 1-5.
/// In intervals of time slots are replenished and nft prices increase
/// @author Nejc Schneider
contract RiverboatNft is IERC721Receiver, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    struct Session(
        uint256  startPrice;		//nft price in current interval
        uint256  priceIncrease;		//how much nftPrice increase every interval
        uint32 startTime			//session start timestamp (max 2106)
        uint32 intervalDuration			//duration of single interval – in seconds
        uint intervalsTotal			//total of intervals
        //instead of intervalsTotal we coule use endTime
        //uint32 endTime			//session end timestamp
    );

    uint256 public currentPrice;
    uint256 public currentInterval;
    uint256 public enableTrade;

    /// @dev session id =>(Session struct)
    mapping(uint256 => Session) public sessions;
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
}
