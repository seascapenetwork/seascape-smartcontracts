soldNftsCountpragma solidity 0.6.7;

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
    /// TODO dont forget to use safeMath where needed
    using SafeMath for uint256;

    /// @notice to mint nft, using nft factory
    NftFactory nftFactory;

    uint256 public tradeEnabled;       // enable/disable buy function
    uint256 public sessionId;          // current sessionId
    address public priceReceiver;      // this address receives the money from bought tokens

    struct Session(
        address currencyAddress;     // currency address
        address nftAddress;          // nft token address
        uint256 startPrice;	         // nft price in the initial interval
        uint256 priceIncrease;		   // how much nftPrice increase every interval
        uint32 startTime;			       // session start timestamp
        uint32 intervalDuration;		 // duration of single interval – in seconds
        uint32 intervalsAmount;	     // total of intervals
        uint32 slotsAmount;          // total of slots
    );

    /// @dev session id => Session struct
    mapping(uint256 => Session) public sessions;
    /// ERC721 => true/false
    mapping(address=>bool) public supportedNfts;
    /// ERC20 => true/false
    mapping(address=>bool) public supportedCurrencies;
    /// sessionId => slotId => soldNftsCount
    mapping((uint256 => mapping(uint256 => uint256) public soldNftsCount;
    /// sessionId => slotId => intervalId => buyersAddress
    mapping(uint256 => mapping(uint256 => mapping(uint256 => address))) public nftMinters;


    event Buy(
        uint256 indexed sessionId,
        uint256 indexed slotId,
        uint256 indexed intervalNumber,
        uint256 price,
        address nftAddress,
        address feeReceiver,
        address indexed sender
    );

    event startSession(
        uint256 indexed sessionId,
        address currencyAddress,
        address indexed nftAddress,
        uint256 startPrice,
        uint256 priceIncrease,
        uint32 startTime,
        uint32 intervalDuration,
        uint32 intervalsAmount,
        uint32 slotsAmount
    );

    /// @dev initialize the contract
    /// @param _priceReceiver
    /// @param _nftAddress initial supported nft series
    /// @param _currencyAddress initial supported currency (ERC20)
    /// @param _factoryAddress factory for minting nfts
    constructor(
        address _priceReceiver,
        address _nftAddress,
        address _currencyAddress,
        address _factoryAddress     // may need to move factory address to session struct
    )
        public
    {
          require(_priceReceiver != address(0), "Invalid money receiver address");
          require(_nftAddress != address(0), "Invalid nft address");
          require(_currencyAddress != address(0), "Invalid currency address");
          require(_factoryAddress != address(0), "Invalid factory address");

          nftFactory = NftFactory(_factoryAddress);

          priceReceiver = _priceReceiver;
          supportedNfts[_nftAddress] = true;
          supportedCurrencies[_currencyAddress] = true;

          sessionId.increment(); 	// starts at value 1
    }

    //--------------------------------------------------------------------
    // onlyOwner external functions
    //--------------------------------------------------------------------

    /// @notice enable/disable buy function
    /// @param _tradeEnabled set tradeEnabled to true/false
    function enableTrade(bool _tradeEnabled) external onlyOwner { tradeEnabled = _tradeEnabled; }

    // @notice Sets NFT factory that will mint a token for buyers
    // @param _address a new Address of Nft Factory
    /// TODO may need to move factory to session struct and remove this function
    function setNftFactory(address _address) external onlyOwner {
        require(_address != 0x0, "address can't be 0x0");
        // TODO require session is not active or about to start
        nftFactory = NftFactory(_address);
    }

    /// @notice add supported nft token
    /// @param _nftAddress ERC721 contract address
    function addSupportedNft(address _address) external onlyOwner {
        require(_address != 0x0, "address can't be 0x0")
        require(!supportedNfts[_address], "address already supported");
        supportedNfts[_address] = true;
    }

    /// @notice disable supported nft token
    /// @param _nftAddress ERC721 contract address
    function removeSupportedNft(address _address) external onlyOwner {
        require(_address != 0x0, "invalid address")
        require(supportedNfts[_address], "address already unsupported");
        supportedNfts[_address] = false;
    }

    /// @notice add supported currency address for bounty
    /// @param _currencyAddress ERC20 contract address
    function addSupportedCurrency(address _currencyAddress) external onlyOwner {
        require(_currencyAddress != address(0x0), "invalid address");
        require(!supportedCurrencies[_currencyAddress], "currency already supported");
        supportedCurrencies[_currencyAddress] = true;
    }

    /// @notice disable supported currency address for bounty
    /// @param _currencyAddress ERC20 contract address
    function removeSupportedCurrency(address _currencyAddress) external onlyOwner {
        require(_currencyAddress != address(0x0), "invalid address");
        require(supportedCurrencies[_currencyAddress], "currency already removed");
        supportedCurrencies[_currencyAddress] = false;
    }

    /// TODO requires factory contract
    // authorize address to mint unsold nfts
    function authorizeMinter(uint _sessionId, address _authorizedAddress) external onlyOwner {
        if(_authorizedAddress ! Authorized){
            // give factory permission for _authorizedAddress to mint all remaining nfts in _sessionId
            /// TODO declare mapping authorizedAccesses (sessionId => )
        }
        // address already have permission to factory, so just give him permission to mint the remaining
        // nfts in _sessionId. Actual minting will be done through calling *another function*
    }

    /// @dev start a new session, during which players are allowed to buy nfts
    /// @parm _currencyAddress ERC20 token to be used during the session
    /// @param _nftAddress ERC721 token to be used during the session
    /// @param _startPrice nfts price in the first interval
    /// @param _priceIncrease how much price increases each interval
    /// @param _startTime timestamp at which session becomes active
    /// @param _intervalDuration duration of each interval
    /// @param _intervalsAmount how many intervals are in a session
    /// @param _slotsAmount how many nft slots are in a session
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
        onlyOwner
        external
    {
        /// cant start new session when another is active
        if (sessionId > 0)
            require(!isActive(sessionId), "another session is still active");
        require(supportedCurrencies[_currencyAddress], "unsupported currency");
        require(supportedNfts[_nftAddress], "unsupported nft");
        require(_startPrice > 0, "start price can't be 0");
        // following require statement may be omitted
        require(_priceIncrease > 0, "price increase can't be 0");
        require(_startTime > block.timestamp, "session should start in future");
        require(_intervalDuration > 0, "interval duration can't be 0");
        require(_intervalsAmount > 0, "intervals amount can't be 0");
        require(_slotsAmount > 0, "slots amount can't be 0");

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
        sessionId.increment();

        emit startSession(
          sessionId,
          _currencyAddress,
          _nftAddress,
          _startPrice,
          _priceIncrease,
          _startTime,
          _intervalDuration,
          _intervalsAmount,
          _slotsAmount
        );
    }

    //--------------------------------------------------------------------
    // External functions
    //--------------------------------------------------------------------

    /// @notice buy nft at selected slot
    /// @param _sessionId session unique identifier
    /// @param _slotNumber number of selected slot
    /// @return _mintedTokenId id of newly minted nft
    function Buy(uint256 _sessionId, uint256 _slotNumber, uint8 _v, bytes32 _r, bytes32 _s)
        external
        returns (uint)
    {
        //require stamements
        require(isActive(_sessionId), "session is not active");

        // must determine current interval and current price
        uint256 _currentInterval = getCurrentInterval(_sessionId);
        uint256 _currentPrice = getCurrentPrice(_sessionId, _currentInterval);

        require(nftAtSlotAvailable(_sessionId, _intervalNumber, _slotNumber));
        // require: user must have enough balance

        Session storage session = sessions[_sessionId];
        // mark nft as sold with buyer address and increase soldNftsCount
        nftMinters[_sessionId][_slotNumber][_currentInterval] = msg.sender;
        soldNftsCount[_sessionId][_slotId]++;

        /// digital signature part
        bytes memory _prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(
            msg.sender,
            _slotNumber,
            _currentInterval,
            soldNftsCount[_sessionId][_slotId],
        ));
        bytes32 _message = keccak256(abi.encodePacked(_prefix, _messageNoPrefix));
        address _recover = ecrecover(_message, _v, _r, _s);
        require(_recover == owner(), "Verification failed");

        // transfer _currentPrice from buyer to priceReceiver
        IERC20(session.currencyAddress).safeTransferFrom(msg.sender, priceReceiver, _currentPrice);
        // TODO mint nft using factory (passing _slotNumber)
        uint256 _mintedTokenId = nftFactory.mintType(msg.sender, _slotNumber);
	      require(_mintedTokenId > 0,	"failed to mint a token");

        /// emit events
        emit Buy(
          _sessionId,
          _slotNumber
          _currentPrice,
          _currentInterval,
          sessions[_sessionId].supportedNft,
          feeReceiver,
          msg.sender
        );

        return _mintedTokenId;
    }

    /// CAUTION this function is a bottleneck so make sure it works properly
    /// TODO fill this function
    function withdrawUnsoldNfts(uint _sessionId) external {
        // require msg.sender = owner or msg.sender = authorizedAddress
        // as nfts are minted make sure to keep track by saving minters address to nftMinters mapping
        // msg.sender should be able to mint ALL unminted nfts of that session.
        // require that session is finished
        // querry all the unsold nfts:
        // uint[] unsoldNfts = new array[sessions[_sessionId].slotsAmount]
        // or mapping slotId => unsoldNftsAmount
        // for (0; sessions[_sessionId].slotsAmount; ++)
        // functionCall - getUnsoldNftsPerSlot and save them to array/mapping
    }

    //--------------------------------------------------------------------
    // internal functions
    //--------------------------------------------------------------------

    /// @notice check that nft at slot is available for sell
    /// @param _seesionId session unique identifier
    /// @param _intervalNumber number of the interval
    /// @param _slotNumber slot index
    /// @return true if nft at slot is unsold
    function nftAtSlotAvailable(uint _sessionId, uint _intervalNumber, uint _slotNumber)
        internal
        view
        returns (bool)
    {
        require(_slotNumber < sessions[_sessionId].slotsAmount,
            "slot number too high");
        require(_intervalNumber < sessions[_sessionId].intervalsAmount,
            "interval number too high")
      	if(nftMinters[_sessionId][_slotNumber][_intervalNumber] == address(0))
            return true;
        return false;
    }

    // NOTE this function requires extensive testing
    /// @dev calculate current interval number
    /// @param _sessionId session unique identifier
    /// @return interval number
    function getCurrentInterval(uint256 _sessionId) internal view returns(uint) {
        _currentInterval = (now - sessions[_sessionId].startTime) / sessions[_sessionId]
            .intervalDuration;
        // NOTE _currentInterval will start with 0 so lastInterval should be intervalsAmoun-1
        require(_currentInterval < sessions[_sessionId].intervalsAmount,
            "_currentInterval > intervalsAmount, session should be finished");
        return _currentInterval;
    }

    // NOTE this function requires extensive testing
    /// @dev calculate current nft price
    /// @param _sessionId session unique identifier
    /// @param _currentInterval number of the current interval
    /// @return nft price
    function getCurrentPrice(uint256 _sessionId, uint256 _currentInterval)
        internal
        view
        returns (uint)
    {
        // if _currentInterval = 0, session.startPrice will be returned
        _currentPrice = sessions[_sessionId].startPrice + sessions[_sessionId]
            .priceIncrease * _currentInterval;
        return _currentPrice;
    }

    /// @dev check if session is currently active
    /// @param _sessionId id to verify
    /// @return true/false depending on timestamp period of the sesson
    function isActive(uint256 _sessionId) internal view returns (bool){
        Session memory session = sessions[_sessionId];
        if(now > session.startTime && now < session
            .startTime + session.intervalsAmount * session.intervalsDuration){
            return true;
        }
        return false;
    }

    /// @dev check if session is about to start
    /// @param _sessionId id to verify
    /// @return true/false depending on start time of the sesson
    function isAboutToStart(uint256 _sessionId) internal view returns (bool){
        Session memory session = sessions[_sessionId];
        if(now < session.startTime)
            return true;
        return false;
    }

    /// @dev check if session is already finished
    /// @param _sessionId id to verify
    /// @return true if session is finished
    function isFinished(uint256 _sessionId) internal view returns (bool){
        Session memory session = sessions[_sessionId];
        if(now > ssession.startTime + session.intervalsAmount * session.intervalsDuration)
            return true;
        return false;
    }
}
