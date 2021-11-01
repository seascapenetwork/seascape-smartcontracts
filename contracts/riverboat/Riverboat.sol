pragma solidity 0.6.7;

import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./RiverboatNft.sol";


/// @title RiverboatNft is a nft service platform
/// User can buy nft at a slots 1-5
/// In intervals of time slots are replenished and nft prices increase
/// @author Nejc Schneider
contract Riverboat is IERC721Receiver, Ownable {
    using SafeERC20 for IERC20;

    bool public tradeEnabled;       // enable/disable buy function
    uint256 public sessionId;          // current sessionId
    address public priceReceiver;      // this address receives the money from bought tokens

    struct Session{
        address currencyAddress;            // currency address
        address nftAddress;               // nft address used for sending
        uint256 startPrice;	                // nft price in the initial interval
        uint256 priceIncrease;		          // how much nftPrice increase every interval
        uint32 startTime;			              // session start timestamp
        uint32 intervalDuration;		       // duration of single interval – in seconds
        uint32 intervalsAmount;	          // total of intervals
        uint32 slotsAmount;               // total of slots
    }

    /// @dev session id => Session struct
    mapping(uint256 => Session) public sessions;
    /// @dev keep track of sold nfts while session is active
    /// sessionId => intervalId => buyerAddress => bool
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public nftMinters;

    event Buy(
        uint256 indexed sessionId,
        uint256 intervalNumber,
        uint256 price,
        uint256 nftId,
        address indexed buyer
    );

    event StartSession(
        uint256 indexed sessionId,
        uint256 startPrice,
        uint256 priceIncrease,
        uint32 startTime,
        uint32 intervalDuration,
        uint32 intervalsAmount,
        uint32 slotsAmount,
        address currencyAddress,
        address nftAddress
    );

    event WithdrawUnsoldNfts(
        uint256 indexed sessionId,
        address indexed nftAddress,
        address receiverAddress
    );

    /// NOTE only for testing - to be deleted
    event getTime(
        uint256 currentTime
    );

    /// @dev initialize the contract
    /// @param _priceReceiver recipient of the price during nft buy
    constructor(address _priceReceiver) public {
        require(_priceReceiver != address(0), "Invalid price receiver address");
        priceReceiver = _priceReceiver;
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
    /// @param _nftAddress address of nft
    /// @param _startPrice nfts price in the first interval
    /// @param _priceIncrease how much price increases each interval
    /// @param _startTime timestamp at which session becomes active
    /// @param _intervalDuration duration of each interval
    /// @param _intervalsAmount how many intervals are in a session
    /// @param _slotsAmount amount of nft slots in a session
    function startSession(
        address _currencyAddress,
        address _nftAddress,
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
        require(_nftAddress != address(0), "invalid nft address");
        require(_startPrice > 0, "start price can't be 0");
        require(_priceIncrease > 0, "price increase can't be 0");
        require(_startTime > block.timestamp, "session should start in future");
        require(_intervalDuration > 0, "interval duration can't be 0");
        require(_intervalsAmount > 0, "intervals amount can't be 0");
        require(_slotsAmount > 0, "slots amount can't be 0");

        sessionId++;
        sessions[sessionId] = Session(
            _currencyAddress,
            _nftAddress,
            _startPrice,
            _priceIncrease,
            _startTime,
            _intervalDuration,
            _intervalsAmount,
            _slotsAmount
        );

        emit StartSession(
            sessionId,
            _startPrice,
            _priceIncrease,
            _startTime,
            _intervalDuration,
            _intervalsAmount,
            _slotsAmount,
            _currencyAddress,
            _nftAddress
        );
    }

    /// @dev after session is finished owner can approve withdrawal of remaining nfts
    /// @param _sessionId session unique identifier
    /// @param _receiverAddress address which will receive the nfts
    function approveUnsoldNfts(uint _sessionId, address _receiverAddress)
        external
        onlyOwner
    {
        require(isFinished(_sessionId), "seesion needs to be finished");
        IERC721(sessions[_sessionId].nftAddress).setApprovalForAll(_receiverAddress, true);

        emit WithdrawUnsoldNfts(_sessionId, sessions[_sessionId].nftAddress, _receiverAddress);
    }

    //--------------------------------------------------------------------
    // External functions
    //--------------------------------------------------------------------

    /// @notice buy nft at selected slot
    /// @param _sessionId session unique identifier
    /// @param _nftId id of nft
    function buy(uint256 _sessionId, uint256 _nftId)
        external
    {
        //require stamements
        uint256 _currentInterval = getCurrentInterval(_sessionId);
        uint256 _currentPrice = getCurrentPrice(_sessionId, _currentInterval);
        require(nftAtSlotAvailable(_sessionId, _currentInterval, _nftId),
            "nft at slot not available");

        // update state
        nftMinters[_sessionId][_currentInterval][msg.sender] = true;

        /// make transactions
        address _currencyAddress = sessions[_sessionId].currencyAddress;
        IERC20(_currencyAddress).safeTransferFrom(msg.sender, priceReceiver, _currentPrice);
        address _nftAddress = sessions[_sessionId].nftAddress;
        IERC721(_nftAddress).safeTransferFrom(address(this), msg.sender, _nftId);

        /// emit events
        emit Buy(
          _sessionId,
          _currentInterval,
          _currentPrice,
          _nftId,
          msg.sender
        );
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


    /// @notice check that nft at slot is available for sell
    /// @param _sessionId session unique identifier
    /// @param _intervalNumber number of the interval
    /// @param _nftId nft identifier
    /// @return true if nft at slot is unsold
    function nftAtSlotAvailable(uint _sessionId, uint _intervalNumber, uint _nftId)
        internal
        view
        returns (bool)
    {
        require(IERC721(sessions[_sessionId].nftAddress).ownerOf(_nftId) == address(this), "contract not owner of nft id");

        require(_intervalNumber < sessions[_sessionId].intervalsAmount,
            "interval number too high");

        /// @dev single address may only buy one nft per interval
        return !nftMinters[_sessionId][_intervalNumber][msg.sender];

    }

    /// @dev calculate current interval number
    /// @param _sessionId session unique identifier
    /// @return current interval number
    function getCurrentInterval(uint256 _sessionId) public view returns(uint) {
        require(isActive(_sessionId), "session is not active");
        uint256 _currentInterval = (now - sessions[_sessionId]
            .startTime) / sessions[_sessionId].intervalDuration;
        // @dev _currentInterval will start with 0 so last interval should be intervalsAmoun-1
        require(_currentInterval < sessions[_sessionId].intervalsAmount,
            "_currentInterval > intervalsAmount, session is finished");
        return _currentInterval;
    }

    /// @dev calculate current nft price
    /// @param _sessionId session unique identifier
    /// @param _currentInterval number of the current interval
    /// @return nft price for the current interval
    function getCurrentPrice(uint256 _sessionId, uint256 _currentInterval)
        public
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
        if(now >= session.startTime && now < session
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

    //--------------------------------------------------------------------
    // temporary functions - only for testing
    //--------------------------------------------------------------------

    function returnTime() external returns(uint){
        emit getTime(1);
        return block.timestamp;
    }
}
