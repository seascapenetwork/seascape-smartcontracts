
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "./LighthouseTierInterface.sol";


/// @title RiverboatNft is a nft service platform
/// User can buy nft at a slots 1-5
/// In intervals of time slots are replenished and nft prices increase
/// @author Nejc Schneider
contract Riverboat is IERC721Receiver, Ownable {
    using SafeERC20 for IERC20;

    bool public tradeEnabled = true;   // enable/disable buy function
    uint256 public sessionId;          // current sessionId
    address public priceReceiver;      // this address receives the money from bought tokens
    address public verifier;           // address to verify digital signature against

    struct Session{
        address currencyAddress;            // currency address
        address nftAddress;                 // nft address used for sending
        address lighthouseTierAddress;      // address of LighthouseTier external contract
        uint256 startPrice;	                // nft price in the initial interval
        uint256 priceIncrease;		          // how much nftPrice increase every interval
        uint32 startTime;			              // session start timestamp
        uint32 intervalDuration;		        // duration of single interval – in seconds
        uint32 intervalsAmount;	            // total of intervals
        uint32 slotsAmount;                 // total of slots
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
        address nftAddress
    );

    event WithdrawUnsoldNfts(
        uint256 indexed sessionId,
        address indexed nftAddress,
        address receiverAddress
    );

    /// @dev initialize the contract
    /// @param _priceReceiver recipient of the price during nft buy
    constructor(address _priceReceiver, address _verifier) public {
        require(_priceReceiver != address(0), "Invalid price receiver address");
        priceReceiver = _priceReceiver;
        require(_verifier != address(0), "Invalid verifier address");
        verifier = _verifier;
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
        require(_priceReceiver != address(0), "Invalid price receiver address");
        priceReceiver = _priceReceiver;
    }

    /// @notice change verifier address
    /// @param _verifier address of new verifier
    function setVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Invalid verifier address");
        verifier = _verifier;
    }

    /// @dev start a new session, during which players are allowed to buy nfts
    /// @param _currencyAddress ERC20 token to be used during the session
    /// @param _nftAddress address of nft
    /// @param _lighthouseTierAddress tier contract address, if 0x0 tier is not requirement
    /// @param _startPrice nfts price in the first interval
    /// @param _priceIncrease how much price increases each interval
    /// @param _startTime timestamp at which session becomes active
    /// @param _intervalDuration duration of each interval
    /// @param _intervalsAmount how many intervals are in a session
    /// @param _slotsAmount amount of nft slots in a session
    function startSession(
        address _currencyAddress,
        address _nftAddress,
        address _lighthouseTierAddress,
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
        require(_startTime > now, "session should start in future");
        require(_intervalDuration > 0, "interval duration can't be 0");
        require(_intervalsAmount > 0, "intervals amount can't be 0");
        require(_slotsAmount > 0, "slots amount can't be 0");

        sessionId++;
        sessions[sessionId] = Session(
            _currencyAddress,
            _nftAddress,
            _lighthouseTierAddress,
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
            _nftAddress
        );
    }

    /// @dev after session is finished owner can approve withdrawal of remaining nfts
    /// @param _sessionId session unique identifier
    /// @param _receiverAddress address which will receive the nfts
    function approveUnsoldNfts(uint256 _sessionId, address _receiverAddress)
        external
        onlyOwner
    {
        require(_receiverAddress != address(0), "invalid receiver address");
        require(isFinished(_sessionId), "sesson needs to be finished");
        IERC721(sessions[_sessionId].nftAddress).setApprovalForAll(_receiverAddress, true);

        emit WithdrawUnsoldNfts(_sessionId, sessions[_sessionId].nftAddress, _receiverAddress);
    }

    //--------------------------------------------------------------------
    // External functions
    //--------------------------------------------------------------------

    /// @notice buy nft at selected slot
    /// @param _sessionId session unique identifier
    /// @param _nftId id of nft
    function buy(uint256 _sessionId, uint256 _nftId, uint8 _v, bytes32 _r, bytes32 _s) external {
        Session storage _session = sessions[_sessionId];
        //require stamements
        uint256 _currentInterval = getCurrentInterval(_sessionId);
        uint256 _currentPrice = getCurrentPrice(_sessionId, _currentInterval);
        require(IERC721(_session.nftAddress).ownerOf(_nftId) == address(this),
            "contract not owner of this nft");
        require(!nftMinters[_sessionId][_currentInterval][msg.sender],
            "cant buy more nfts per interval");
        require(tradeEnabled, "trade is disabled");

        /// @dev make sure msg.sender has obtained tier in LighthouseTier.sol
        /// LighthouseTier.sol is external but trusted contract maintained by Seascape
        if(_session.lighthouseTierAddress != address(0)){
            LighthouseTierInterface tier = LighthouseTierInterface(_session
                .lighthouseTierAddress);
            require(tier.getTierLevel(msg.sender) > -1, "tier rank 0-4 is required");
        }

        /// @dev digital signature part
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(
            _sessionId,
            _nftId,
            _currentInterval,
            getChainId(),
            _currentPrice,
            address(this),
            _session.currencyAddress,
            _session.nftAddress
        ));
        bytes32 _message = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32", _messageNoPrefix));
        address _recover = ecrecover(_message, _v, _r, _s);
        require(_recover == verifier,  "Verification failed");

        // update state
        nftMinters[_sessionId][_currentInterval][msg.sender] = true;

        /// make transactions
        IERC20(_session.currencyAddress).safeTransferFrom(msg.sender, priceReceiver, _currentPrice);
        IERC721(_session.nftAddress).safeTransferFrom(address(this), msg.sender, _nftId);

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

    /// @notice get remaining time in current interval
    /// @param _sessionId session unique identifier
    /// @return time in seconds
    function getIntervalTime(uint256 _sessionId) external view returns(uint) {
        if(!isActive(_sessionId)) {
            return 0;
        } else {
            return (now - sessions[_sessionId]
              .startTime) % sessions[_sessionId].intervalDuration;
        }
    }

    //--------------------------------------------------------------------
    // public functions
    //--------------------------------------------------------------------

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
    // private functions
    //--------------------------------------------------------------------

    /// @dev retrieve executing chain id
    /// @return network identifier
    function getChainId() public pure returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

}
