pragma solidity 0.6.7;

import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./RiverboatNft.sol";
import "./RiverboatFactory.sol";


/// @title RiverboatNft is a nft service platform
/// User can buy nft at a slots 1-5
/// In intervals of time slots are replenished and nft prices increase
/// @author Nejc Schneider
contract Riverboat is IERC721Receiver, Ownable {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;    /// TODO use counters for sessionId
    /// TODO dont forget to use safeMath where needed (incl. uint32)
    using SafeMath for uint256;

    bool public tradeEnabled;       // enable/disable buy function
    // TODO use Counters on sessionId
    uint256 public sessionId;          // current sessionId
    address public priceReceiver;      // this address receives the money from bought tokens

    struct Session{
        address currencyAddress;     // currency address
        uint256 startPrice;	         // nft price in the initial interval
        uint256 priceIncrease;		   // how much nftPrice increase every interval
        uint32 startTime;			       // session start timestamp
        uint32 intervalDuration;		 // duration of single interval – in seconds
        uint32 intervalsAmount;	     // total of intervals
        uint32 slotsAmount;          // total of slots
        RiverboatFactory factoryAddress; // factory used for minting nfts
    }

    /// @dev session id => Session struct
    mapping(uint256 => Session) public sessions;
    /// @dev this mapping is used for minting the unsold nfts after session is finished
    /// sessionId => slotId => unsoldNftsCount
    mapping(uint256 => mapping(uint256 => uint256)) public unsoldNftsCount;
    /// @dev this mapping is used for keeping track of sold nfts while session is active
    /// sessionId => slotId => intervalId => buyersAddress
    mapping(uint256 => mapping(uint256 => mapping(uint256 => address))) public nftMinters;

    event Buy(
        uint256 indexed sessionId,
        uint256 slotId,
        uint256 intervalNumber,
        uint256 price,
        uint256 nftId,
        address indexed buyer
    );

    event StartSession(
        uint256 indexed sessionId,
        uint256 indexed startPrice,
        uint256 priceIncrease,
        uint32 startTime,
        uint32 intervalDuration,
        uint32 intervalsAmount,
        uint32 slotsAmount,
        address indexed factoryAddress
    );

    /// @dev initialize the contract
    /// @param _priceReceiver recipient of the price during nft buy
    constructor(address _priceReceiver) public {
        require(_priceReceiver != address(0), "Invalid price receiver address");

        priceReceiver = _priceReceiver;
        //sessionId.increment(); 	// starts at value 1
        // sessionId++;
    }

    //--------------------------------------------------------------------
    //  external onlyOwner functions
    //--------------------------------------------------------------------

    /// @notice enable/disable buy function
    /// @param _tradeEnabled set tradeEnabled to true/false
    function enableTrade(bool _tradeEnabled) external onlyOwner {
        tradeEnabled = _tradeEnabled;
    }

    /// @notice change price receiver address
    /// @param _priceReceiver address of new receiver
    function setPriceReceiver(address _priceReceiver) external onlyOwner {
        require(_priceReceiver != address(0), "Invalid address");
        priceReceiver = _priceReceiver;
    }

    /// @dev start a new session, during which players are allowed to buy nfts
    /// @param _currencyAddress ERC20 token to be used during the session
    /// @param _factoryAddress address of nft factory
    /// @param _startPrice nfts price in the first interval
    /// @param _priceIncrease how much price increases each interval
    /// @param _startTime timestamp at which session becomes active
    /// @param _intervalDuration duration of each interval
    /// @param _intervalsAmount how many intervals are in a session
    /// @param _slotsAmount amount of nft slots in a session
    function startSession(
        address _currencyAddress,
        address _factoryAddress,
        uint256 _startPrice,
        uint256 _priceIncrease,
        uint32 _startTime,
        uint32 _intervalDuration,
        uint32 _intervalsAmount,
        uint32 _slotsAmount
    )
        external
        onlyOwner
    {
        if (sessionId > 0)
            require(isFinished(sessionId), "last session hasnt finished yet");
        require(_currencyAddress != address(0), "invalid currency address");
        require(_factoryAddress != address(0), "invalid factory address");
        require(_startPrice > 0, "start price can't be 0");
        // NOTE following require statement may be omitted
        require(_priceIncrease > 0, "price increase can't be 0");
        require(_startTime > block.timestamp, "session should start in future");
        require(_intervalDuration > 0, "interval duration can't be 0");
        require(_intervalsAmount > 0, "intervals amount can't be 0");
        require(_slotsAmount > 0, "slots amount can't be 0");

        sessionId++;
        sessions[sessionId] = Session(
            _currencyAddress,
            _startPrice,
            _priceIncrease,
            _startTime,
            _intervalDuration,
            _intervalsAmount,
            _slotsAmount,
            RiverboatFactory(_factoryAddress)
        );
        initializeUnsoldNftsCount(sessionId);

        emit StartSession(
            sessionId,
            _startPrice,
            _priceIncrease,
            _startTime,
            _intervalDuration,
            _intervalsAmount,
            _slotsAmount,
            _factoryAddress
        );
    }

    /// CAUTION this function is a bottleneck so make sure it works properly
    /// @dev after session is finished owner can withdraw unminted nfts
    /// @param _sessionId session unique identifier
    /// @param _receiverAddress address which will receive the nfts
    function withdrawUnsoldNfts(uint _sessionId, address _receiverAddress) external onlyOwner {
        require(isFinished(_sessionId), "seesion needs to be finished");

        for(uint256 _slotId = 0; _slotId < sessions[_sessionId].slotsAmount; _slotId++) {
            while(unsoldNftsCount[_sessionId][_slotId] > 0) {
                unsoldNftsCount[_sessionId][_slotId].sub(1);

                uint256 _mintedTokenId = sessions[_sessionId]
                    .factoryAddress.mintType(_receiverAddress, _slotId);
                require(_mintedTokenId > 0,	"failed to mint a token");
            }
        }
        /// TODO add event, maybe return value
    }

    //--------------------------------------------------------------------
    // External functions
    //--------------------------------------------------------------------

    /// @notice buy nft at selected slot
    /// @param _sessionId session unique identifier
    /// @param _slotId number of selected slot
    /// @return _mintedTokenId id of newly minted nft
    function buy(uint256 _sessionId, uint256 _slotId, uint8 _v, bytes32 _r, bytes32 _s)
        external
        returns (uint)
    {
        //require stamements
        require(isActive(_sessionId), "session is not active");
        uint256 _currentInterval = getCurrentInterval(_sessionId);
        uint256 _currentPrice = getCurrentPrice(_sessionId, _currentInterval);
        require(nftAtSlotAvailable(_sessionId, _currentInterval, _slotId));
        /// TODO check that buyer has sufficient balances

        // update state
        nftMinters[_sessionId][_slotId][_currentInterval] = msg.sender;
        unsoldNftsCount[_sessionId][_slotId].sub(1);

        /// digital signature part
        bytes memory _prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(
            msg.sender,
            _slotId,
            _currentInterval,
            unsoldNftsCount[_sessionId][_slotId]
        ));
        bytes32 _message = keccak256(abi.encodePacked(_prefix, _messageNoPrefix));
        address _recover = ecrecover(_message, _v, _r, _s);
        require(_recover == owner(), "Verification failed");

        /// make transactions
        address _currencyAddress = sessions[_sessionId].currencyAddress;
        IERC20(_currencyAddress).safeTransferFrom(msg.sender, priceReceiver, _currentPrice);
        uint256 _mintedTokenId = sessions[_sessionId].factoryAddress.mintType(msg.sender, _slotId);
	      require(_mintedTokenId > 0,	"failed to mint a token");

        /// emit events
        emit Buy(
          _sessionId,
          _slotId,
          _currentInterval,
          _currentPrice,
          _mintedTokenId,
          msg.sender
        );

        return _mintedTokenId;
    }

    /// @dev encrypt token data
    /// @return encrypted data
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    )
        external
        override
        returns (bytes4)
    {
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

    //--------------------------------------------------------------------
    // internal functions
    //--------------------------------------------------------------------

    /// @dev when the session starts, initialize the unsoldNftsCount mapping
    /// @param _sessionId session unique identifier
    function initializeUnsoldNftsCount(uint256 _sessionId) internal {
        for(uint256 _slotId = 0; _slotId < sessions[_sessionId].slotsAmount; _slotId++) {
            unsoldNftsCount[_sessionId][_slotId] = sessions[_sessionId]
                .slotsAmount * sessions[_sessionId].intervalsAmount;
        }
    }

    /// @notice check that nft at slot is available for sell
    /// @param _sessionId session unique identifier
    /// @param _intervalNumber number of the interval
    /// @param _slotId slot number
    /// @return true if nft at slot is unsold
    function nftAtSlotAvailable(uint _sessionId, uint _intervalNumber, uint _slotId)
        internal
        view
        returns (bool)
    {
        require(_slotId < sessions[_sessionId].slotsAmount,
            "slot number too high");
        require(_intervalNumber < sessions[_sessionId].intervalsAmount,
            "interval number too high");
      	if(nftMinters[_sessionId][_slotId][_intervalNumber] == address(0))
            return true;
        return false;
    }

    // CAUTION this function requires extensive testing
    /// @dev calculate current interval number
    /// @param _sessionId session unique identifier
    /// @return current interval number
    function getCurrentInterval(uint256 _sessionId) internal view returns(uint) {
        uint256 _currentInterval = (now - sessions[_sessionId]
            .startTime) / sessions[_sessionId].intervalDuration;
        // NOTE _currentInterval will start with 0 so lastInterval should be intervalsAmoun-1
        require(_currentInterval < sessions[_sessionId].intervalsAmount,
            "_currentInterval > intervalsAmount, session is finished");
        return _currentInterval;
    }

    // CAUTION this function requires extensive testing
    /// @dev calculate current nft price
    /// @param _sessionId session unique identifier
    /// @param _currentInterval number of the current interval
    /// @return nft price for the current interval
    function getCurrentPrice(uint256 _sessionId, uint256 _currentInterval)
        internal
        view
        returns (uint)
    {
        // if _currentInterval = 0, session.startPrice will be returned
        uint256 _currentPrice = sessions[_sessionId].startPrice + sessions[_sessionId]
            .priceIncrease * _currentInterval;
        return _currentPrice;
    }

    /// @dev check if session is currently active
    /// @param _sessionId id to verify
    /// @return true/false depending on timestamp period of the sesson
    function isActive(uint256 _sessionId) internal view returns (bool){
        Session storage session = sessions[_sessionId];
        if(now > session.startTime && now < session
            .startTime + session.intervalsAmount * session.intervalDuration){
            return true;
        }
        return false;
    }

    /// @dev check if session is already finished
    /// @param _sessionId id to verify
    /// @return true if session is finished
    function isFinished(uint256 _sessionId) internal view returns (bool){
        Session memory session = sessions[_sessionId];
        if(now > session.startTime + session.intervalsAmount * session.intervalDuration)
            return true;
        return false;
    }
}
