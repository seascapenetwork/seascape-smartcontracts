pragma solidity 0.6.7;

import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../seascape_nft/NftTypes.sol";
import "./../seascape_nft/NftFactory.sol";
import "./NftRushCrowns.sol";
import "./NftRushLeaderboard.sol";
import "./NftRushGameSession.sol";

/// @title Nft Rush a game on seascape platform allowing to earn Nft by spending crowns
/// @notice Game comes with Leaderboard located on it's on Solidity file.
/// @author Medet Ahmetson
contract NftRush is Ownable, GameSession, Crowns, Leaderboard {
    using SafeMath for uint256;
    using Counters for Counters.Counter;
    using NftTypes for NftTypes;

    /// @notice nft factory is a contract that mints nfts
    NftFactory nftFactory;    

    /// @notice minimum CWS amount to spend in game.
    /// @dev in WEI format.
    uint256 public minSpend;
    /// @notice maximum CWS amount to spend in game.
    /// @dev in WEI format.
    uint256 public maxSpend;

    uint256 private signer; 
    
    struct Balance {
	    uint256 amount;
	    uint256 mintedTime;
    }

    mapping(address => uint256) public nonces;

    /// @notice Tracking player balance within a game session.
    /// @dev session id =>(wallet address => (Balance struct))
    mapping(uint256 => mapping(address => Balance)) public balances;

    event SessionStarted(uint256 indexed sessionId, uint256 interval, uint256 period, uint256 generation);
    event Spent(address indexed owner, uint256 sessionId, uint256 balanceAmount, uint256 prevMintedTime, uint256 amount);
    event Minted(address indexed owner, uint256 sessionId, uint256 nftId);
    event NftFactorySet(address factory);
    event MinSpendUpdated(uint256 amount);
    event MaxSpendUpdated(uint256 amount);

    constructor(address _crowns, address _factory, uint256 _minSpend, uint256 _maxSpend) public {
        require(_crowns != address(0), "Crowns can't be zero address");
        require(_factory != address(0), "Nft Factory can't be zero address");
        require(_minSpend > 0, "Min spend can't be 0");
        require(_maxSpend > _minSpend, "Max spend should be greater than min limit");
        nftFactory = NftFactory(_factory);

        /// @dev set crowns is defined in Crowns.sol
        setCrowns(_crowns);		

        signer = msg.sender;

        minSpend = _minSpend;
        maxSpend = _maxSpend;
    }
    
    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------

    /** 
     *  @notice Starts a staking session for a finite period of time.
     *  And activated in certain period.
     *
     *  @param _interval duration between claims of Nft
     *  @param _period session duration
     *  @param _startTime session start time in unix timestamp
     *  @param _generation Seascape Nft generation that is given as a reward
     *
     *  Emits an {SessionStarted} event.  
     *
     *  Requirements:
     *
     *  - if some other session was launched before, that session should be ended.
     */
    function startSession(uint256 _interval, uint256 _period, uint256 _startTime, uint256 _generation) external onlyOwner {
        if (lastSessionId() > 0) {
            require(!isActive(lastSessionId()), "NFT Rush: Can't start when session is active");
        }

        uint256 _sessionId = _startSession(_interval, _period, _startTime, _generation);
        
        announceLeaderboard(_sessionId, _startTime);

        emit SessionStarted(_sessionId, _interval, _period, _generation);
    }

    
    /** 
     *  @notice Sets NFT factory that will mint a token for stakers
     *
     *  @param _address a new Address of Nft Factory
     */
    function setNftFactory(address _address) external onlyOwner {
        require(_address != address(0), "Nft Factory can't be zero address");

	    nftFactory = NftFactory(_address);

        emit NftFactorySet(_address);
    }

    /**
     *  @notice minimum amount of Crowns that players could spend
     *
     *  @param _amount a new minimal spending amount in WEI
     */
    function setMinSpendAmount(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Min amount should be greater than 0");
	    minSpend = _amount;

        emit MinSpendUpdated(_amount);
    }
        
    /**
     *  @notice minimum amount of Crowns that players could spend
     *
     *  @param _amount a new minimal spending amount in WEI
     */
    function setMaxSpendAmount(uint256 _amount) external onlyOwner {
	    require(_amount > minSpend, "Max amount should be greater than min amount");
        maxSpend = _amount;

        MaxSpendUpdated(_amount);
    }

    //--------------------------------------------------
    // Only game user
    //--------------------------------------------------

    /**
     *  @notice Spend some crowns in the game, to get higher quality NFTs.
     *  The more spending, higher the chance of getting high quality NFT.
     *
     *  Note, that player should approve Crowns to use by this game contract.
     *
     *  Emits a {Spent} event.
     *
     *  @param _sessionId a session id
     *  @param _amount amount of CWS to spend
     *
     *  Requirements:
     *
     *  - `_amount` must be atleast equal to `minSpend`
     *  - `_sessionId` must be greater than 0
     *  - session of `_sessionId` must be active
     *  - The spender should have `amount` of Crowns
     *  - Spending of Crowns must be successfull. Fails, if not granted a permission
     */
    function spend(uint256 _sessionId, uint256 _amount) external {
        require(_amount >= minSpend,
            "NFT Rush: Amount of CWS to spend should be greater or equal to min deposit");
        require(_amount <= maxSpend,
            "Nft Rush: Amount of CWS to spend should be less or equal to max deposit");
        require(_sessionId > 0,
            "NFT Rush: Session is not started yet!");
        require(isActive(_sessionId),
            "NFT Rush: Game session is already finished");
        require(crowns.balanceOf(msg.sender) >= _amount,
            "NFT Rush: Not enough CWS, please check your CWS balance");
        require(crowns.spendFrom(msg.sender, _amount),
            "NFT Rush: Failed to spend CWS");

        Balance storage _balance  = balances[_sessionId][msg.sender];

        require(_balance.amount.add(_amount) <= maxSpend, 
            "NFT Rush: Can not spent more than max spending limit");

        _balance.amount = _balance.amount.add(_amount);
	
        emit Spent(msg.sender, _sessionId, _balance.amount, _balance.mintedTime, _amount);
    }


    /**
     *  @notice mints Nft of {_quality}.
     *  @dev The Quality of Nft is determined by centralized server. 
     *  As a proof centrlized server returns a signature
     *  to validate the quality
     *
     *  Emits a {Minted} event.
     *
     *  @param _sessionId a game session
     *  @param _v part of signature of message
     *  @param _r part of signature of message
     *  @param _s part of signature of message
     *  @param _quality a quality of minted token
     *
     *  Requirements:
     *
     *  - `balances[_sessionId][msg.sender].amount` must ge greater than 0.
     *  - Quality signer's address should match to this contract' owner's address
     *  - Player should mint it first time, or if not, then locking interval should be passed
     *  - Nft Factory should return Nft id of successfully minted token
     */
    function mint(uint256 _sessionId, uint8 _v, bytes32 _r, bytes32 _s, uint8 _quality) external {
        Session storage _session = sessions[_sessionId];
	    Balance storage _balance = balances[_sessionId][msg.sender];

	    require(_balance.amount > 0,
		    "NFT Rush: No deposit was found");
	    require(_balance.mintedTime == 0 ||
		    (_balance.mintedTime.add(_session.interval) < block.timestamp),
		    "NFT Rush: Still in locking period, please try again after locking interval passes");
	
	    /// Validation of quality
	    /// message is generated as owner + amount + last time stamp + quality
	    bytes memory _prefix = "\x19Ethereum Signed Message:\n32";
	    bytes32 _messageNoPrefix =
	    keccak256(abi.encodePacked(msg.sender,
				       _balance.amount,
				       _balance.mintedTime,
				       _quality,
                       nonces[msg.sender])
		      );
	    bytes32 _message = keccak256(abi.encodePacked(_prefix, _messageNoPrefix));
	    address _recover = ecrecover(_message, _v, _r, _s);

	    require(_recover == signer,
		    "NFT Rush: Failed to verify quality signature");
	
        uint256 _tokenId = nftFactory.mintQuality(msg.sender, _session.generation, _quality);
	    require(_tokenId > 0,
		    "NFT Rush: failed to mint a token");
	
	    _balance.mintedTime = block.timestamp;
	    _balance.amount = 0;
        nonces[msg.sender]++;

	    emit Minted(msg.sender, _sessionId, _tokenId);
    }
}
