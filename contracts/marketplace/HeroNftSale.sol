// SPDX-License-Identifier: MIT
pragma solidity 0.6.7;

import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/security/ReentrancyGuard.sol";


/// @title HeroNftSale is nft selling platform
/// Users with can buy single nft per sale. Nfts are refilled in intervals
contract HeroNftSale is IERC721Receiver, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    bool public tradeEnabled = true;   // enable/disable buy function
    uint256 public sessionId;          // current sessionId
    address payable priceReceiver;     // this address receives the money from bought tokens
    address private nftSender;         // this address send the nft to buyer
    address private verifier;          // address to verify digital signature against

    struct Session{
        address tokenAddress;          // currency address
        address nftAddress;            // nft address used for sending
        uint256 startTime;			   // session start timestamp
        uint256 period;                // session duration in seconds
    }

    struct Slot{
        uint256 nftId;                     // the id of a nft for sale
        uint256 salePrice;                 // nft price in the initial interval
        uint256 startTime;                 // this slot slot start timestamp
        // uint256 period;                    // period 
        bool isSold;                       // If it is bought, it becomes true
    }

    /// @dev session id => Session struct
    mapping(uint256 => Session) public sessions;
    /// @dev each slot contains the id and price of the nft being sold
    /// sessionId => Slot
    mapping(uint256 => Slot[10]) public slot;

    event StartSession(uint256 indexed sessionId, address tokenAddress, address nftAddress, uint256 startTime, uint256 period);
    event Buy(uint256 indexed sessionId, uint256 index, uint256 price, uint256 nftId, address indexed buyer);
    event ApproveUnsoldNfts(uint256 indexed sessionId, address indexed nftAddress, address receiverAddress);

    /// @dev initialize the contract
    /// @param _priceReceiver recipient of the price during nft buy
    constructor(address payable  _priceReceiver, address _nftSender, address _verifier) public payable{
        require(_priceReceiver != address(0), "Invalid price receiver address");
        priceReceiver = _priceReceiver;
        require(_nftSender != address(0), "Invalid nft sender address");
        nftSender = _nftSender;
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

    // /// @notice change price receiver address
    // /// @param _priceReceiver address of new receiver
    function setPriceReceiver(address payable _priceReceiver) external onlyOwner {
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
    /// @param _tokenAddress ERC20 token to be used during the session
    /// @param _nftAddress address of nft
    /// @param _startTime timestamp at which session becomes active
    /// @param _period duration of session
    function startSession(address _tokenAddress, address _nftAddress, uint256 _startTime, uint256 _period) external onlyOwner{
        require(_tokenAddress != address(0), "invalid currency address");
        require(_nftAddress != address(0), "invalid nft address");
        require(_startTime > now, "session should start in future");
        require(_period > 0, "session duration can't be 0");

        if (sessionId > 0) {
            require(isActive(sessionId) == false, "can't start when session is already active");
        }

        sessionId++;

        sessions[sessionId] = Session(
            _tokenAddress,
            _nftAddress,
            _startTime,
            _period
        );

        emit StartSession(sessionId, _tokenAddress, _nftAddress, _startTime, _period);
    }

    function addNftToSlot(uint256 _sessionId, bytes calldata data) external onlyOwner{
        require(_sessionId > 0, "Session has not started yet");
        // Session storage _session = sessions[_sessionId];

        (uint256[10] memory _nfts, uint256[10] memory _price, uint256[10] memory _startTime) = abi.decode(data, (uint256[10], uint256[10], uint256[10]));
        
        for (uint8 _index = 0; _index < 10; ++_index) {

            if(_nfts[_index] > 0) {

                slot[_sessionId][_index] = Slot(_nfts[_index], _price[_index], _startTime[_index], false);
            }         
        }
    }

    //--------------------------------------------------------------------
    // External functions
    //--------------------------------------------------------------------

    /// @notice buy nft at selected slot
    /// @param _sessionId session unique identifier
    /// @param _index id of slot
    function buy(uint256 _sessionId, uint256 _index, uint8 _v, bytes32 _r, bytes32 _s) external nonReentrant payable{
        Session storage _session = sessions[_sessionId];
        Slot storage _slot = slot[_sessionId][_index];
        //require stamements
        require(IERC721(_session.nftAddress).ownerOf(_slot.nftId) == nftSender, "sender not owner of this nft");
        require(tradeEnabled, "trade is disabled");
        require(_slot.salePrice > 0, "This nft price big then 0");
        require(isActive(sessionId), "session is ended");
        require(isSold(sessionId, _index), "It's not time to start selling or this nft is sold out");

        /// @dev digital signature part
        {
            bytes32 _messageNoPrefix = keccak256(abi.encodePacked(
                _sessionId,
                _index,
                _slot.nftId,
                _slot.salePrice,
                getChainId(),
                address(this),
                _session.tokenAddress,
                _session.nftAddress
            ));
            bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
            address _recover = ecrecover(_message, _v, _r, _s);
            require(_recover == verifier,  "HeroNftSale: Verification failed");
        }

        /// make transactions
        if (_session.tokenAddress == address(0x0) || _session.tokenAddress == address(0x0000000000000000000000000000000000001010)) {
            require (msg.value >= _slot.salePrice, "your balance is too low");
            priceReceiver.transfer(_slot.salePrice);
        } else {
            IERC20(_session.tokenAddress).safeTransferFrom(msg.sender, priceReceiver, _slot.salePrice);
        }

        IERC721(_session.nftAddress).safeTransferFrom(nftSender, msg.sender, _slot.nftId);

        // update state
        // slot[_sessionId][_index];
        _slot.isSold = true;

        /// emit events
        emit Buy(_sessionId, _index, _slot.salePrice, _slot.nftId, msg.sender);
    }

    // //--------------------------------------------------------------------
    // // public functions
    // //--------------------------------------------------------------------

    /// @dev check if session is currently active
    /// @param _sessionId id to verify
    /// @return true/false depending on timestamp period of the sesson
    function isActive(uint256 _sessionId) private view returns (bool){
        // Session storage session = sessions[_sessionId];
        uint256 _endTime = sessions[_sessionId].startTime.add(sessions[_sessionId].period);

        // _endTime will be 0 if session never started.
        if (now < sessions[_sessionId].startTime || now > _endTime) {
            return false;
        }
        return true;
    }

    function isSold(uint256 _sessionId, uint256 _index) private view returns (bool){
        Slot storage _slot = slot[_sessionId][_index];

        if (now < _slot.startTime || _slot.isSold) {
            return false;
        }
        return true;
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

    /// @dev encrypt token data
    /// @return encrypted data
    function onERC721Received(address, address, uint256, bytes calldata) external override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // Accept native tokens.
    receive() external payable {
        // React to receiving ether
    }
}