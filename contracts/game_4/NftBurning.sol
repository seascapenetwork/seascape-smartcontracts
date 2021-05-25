pragma solidity 0.6.7;

//declare imports
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../seascape_nft/NftFactory.sol";
import "./../seascape_nft/SeascapeNft.sol";
import "./Crowns.sol";



/// @title Nft Burning contract  mints a higher quality nft in exchange for
/// five lower quality nfts + CWS fee
/// @author Nejc Schneider
contract NftBurning is Crowns, Ownable, IERC721Receiver{
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    //initialize contracts; factory cws, nft, sessionId
    NftFactory nftFactory;
    SeascapeNft private nft;
    Counters.Counter private sessionId;

    /// @notice game event struct. as event is a solidity keyword, we call them session instead.
    struct Session {
        uint256 period;       // session duration
        uint256 startTime;    // session start in unixtimestamp
        uint256 endTime;      // session end in unixtimestamp
                              // should be equal to startTime + period
        uint256 generation;		// Seascape Nft generation
        uint256 interval;   	// duration between every minting
        uint256 fee;          // amount of CWS token to spend to mint a new nft
    }

    struct Balance {
	    uint256 amount;        // amount of crowns staked
	    uint256 depositTime;    // time of last deposit
    }


    /// @notice Tracking player balance within a game session.
    /// @dev session id =>(wallet address => (Balance struct))
    mapping(uint256 => mapping(address => Balance)) public balances;


    // session related data
    uint256 public lastSessionId;
    // each session is a seperate object
    mapping(uint256 => Session) public sessions;
    // track minted time per address
    mapping(address => uint256) public mintedTime;

    // sessionId newly created nft owner, burnt nft IDs, minted nft ID, minted nft time
    event Minted(
        uint256 indexed sessionId,
        address indexed owner,
        uint256[5] burnt_nfts,
        uint256 time,
        uint256 minted_nft
    );
    event SessionStarted(
        uint256 indexed sessionId,
        uint256 generation,
        uint256 fee,
        uint256 interval,
        uint256 start_time,
        uint256 end_time
    );
    event FactorySet(address indexed factoryAddress);
    event Staked(address indexed owner, uint256 sessionId, uint256 balanceAmount, uint256 prevMintedTime, uint256 amount);

    // instantinate contracts, start session
    constructor(address _crowns, address _nftFactory, address _nft)  public {

        require(_crowns != address(0), "Crowns can't be zero address");
        require(_nftFactory != address(0), "Nft Factory can't be zero address");

        /// @dev set crowns is defined in Crowns.sol
        setCrowns(_crowns);

        sessionId.increment(); 	// starts at value 1
        nftFactory = NftFactory(_nftFactory);
        nft = SeascapeNft(_nft);
    }

    /// @dev start a new session, during which players are allowed to mint nfts
    /// @param _startTime unix timestamp when session starts
    /// @param _period unix timestamp when session ends. Should be equal to startTime + period
    /// @param _generation generation of newly minted nfts
    /// @param _interval duration between every possible minting
    /// @param _fee amount of CWS token to spend to mint a new nft
    function startSession(
        uint256 _startTime,
        uint256 _period,
        uint256 _generation,
        uint256 _interval,
        uint256 _fee
    )
        external
        onlyOwner
    {
        // cant start new session when another is active
        if (lastSessionId > 0) {
            require(!isActive(lastSessionId), "Another session already active");
        }
        // startTime should be greater than current time
        require(_startTime > block.timestamp, "Seassion should start in the future");
        // period should be greater than 0
        require(_period > 0, "Session duration should be greater than 0");
        // interval should be greater than 0 and less or equal to period
        require(_interval > 0 && _interval <= _period,
            "Interval should be greater than 0 and lower than period");
        // fee should be greater than 0
        require(_fee > 0, "Fee should be greater than 0");


        // from constructor
        require(_minSpend > 0, "Min spend can't be 0");
        require(_maxSpend > _minSpend, "Max spend should be greater than min limit");

        minSpend = _minSpend;
        maxSpend = _maxSpend;


      // from function setMinSpendAmount
      require(_amount > 0, "Min amount should be greater than 0");
      minSpend = _amount;

        emit MinSpendUpdated(_amount);

      // from function setMaxSpendAmount
      require(_amount > minSpend, "Max amount should be greater than min amount");
        maxSpend = _amount;

        emit MaxSpendUpdated(_amount);




    		//--------------------------------------------------------------------
    		// updating session related data
    		//--------------------------------------------------------------------

        uint256 _sessionId = sessionId.current();
        sessions[_sessionId] = Session(
            _period,
            _startTime,
            _startTime+ _period,
            _generation,
            _interval,
            _fee
        );

        sessionId.increment();
        lastSessionId = _sessionId;

        emit SessionStarted(
            _sessionId,
            _generation,
            _fee,
            _interval,
            _startTime,
            _startTime + _period
        );
    }

    /// @notice spend 5 nfts and 1 cws, burn nfts, mint a higher quality nft and send it to player
    /// @param _sessionId id of the active session, during which nfts can be minted
    /// @param _nfts users nfts which will be burned
    /// @param _quality  of the new minting nft
    /// @param _v part of signature of message
    /// @param _r part of signature of message
    /// @param _s part of signature of message
    function mint(
        uint256 _sessionId,
        uint256[5] calldata _nfts,
        uint8 _quality,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        external
    {
        Session storage _session = sessions[_sessionId];

        require(_sessionId > 0, "Session has not started yet");
        require(_nfts.length == 5, "Need to deposit 5 nfts");
        require(_quality >= 1 && _quality <= 5, "Incorrect quality");
        require(isActive(_sessionId), "Game session is already finished");
        require(mintedTime[msg.sender] == 0 ||
            (mintedTime[msg.sender].add(_session.interval) < block.timestamp),
            "Still in locking period, try again later");
        require(crowns.balanceOf(msg.sender) >= _session.fee, "Not enough CWS in your wallet");

        //--------------------------------------------------------------------
        // spend crowns, spend and burn nfts, mint better nft
        //--------------------------------------------------------------------

        // make sure that signature of nft matches with the address of the contract deployer
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(
            _nfts[0],
            _nfts[1],
            _nfts[2],
            _nfts[3],
            _nfts[4],
            _quality
        ));
        bytes32 _message = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32", _messageNoPrefix));
        address _recover = ecrecover(_message, _v, _r, _s);
        require(_recover == owner(),  "Verification failed");

        // spend crowns
        require(crowns.spendFrom(msg.sender, _session.fee), "Failed to spend CWS");

        // verify nfts
        for (uint _index=0; _index < 5; _index++) {
            // all nfts are owned by the function caller.
            require(_nfts[_index] > 0, "Nft id must be greater than 0");
            require(nft.ownerOf(_nfts[_index]) == msg.sender, "Nft is not owned by caller");
        }
        // burn nfts
        for (uint _index=0; _index < 5; _index++) {
            nft.burn(_nfts[_index]);
        }
        // mint better nft
        uint256 mintedNftId = nftFactory.mintQuality(msg.sender, _session.generation, _quality);
        require(mintedNftId > 0, "failed to mint a token");
        mintedTime[msg.sender] = block.timestamp;
        emit Minted(_sessionId, msg.sender, _nfts, now, mintedNftId);
    }

    // from nftRush
    function stake(uint256 _sessionId, uint256 _amount) external {
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

        emit Staked(msg.sender, _sessionId, _balance.amount, _balance.mintedTime, _amount);
    }

    /// @dev sets an nft factory, a smartcontract that mints tokens.
    /// the nft factory should give a permission on it's own side to this contract too.
    /// @param _address nftFactory's new address
    function setNftFactory(address _address) external onlyOwner {
        require(_address != address(0), "Nft Factory address can not be be zero");
        nftFactory = NftFactory(_address);

        emit FactorySet(_address);
    }

    /// @notice check whether session is active or not
    /// @param _sessionId id of session to verify
    /// @return true if session is active
    function isActive(uint256 _sessionId) internal view returns(bool) {
        if (now > sessions[_sessionId].startTime + sessions[_sessionId].period) {
            return false;
	      }
        return true;
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

}
