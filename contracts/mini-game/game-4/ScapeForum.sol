// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

//declare imports
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../../seascape-nft/NftFactory.sol";
import "./../../seascape-nft/SeascapeNft.sol";
import "./../../utils/SetCrowns.sol";


/// @title Nft Burning contract  mints a higher quality nft in exchange for
/// five lower quality nfts + CWS fee
/// @author Nejc Schneider
contract NftBurning is SetCrowns, Ownable, IERC721Receiver{
    using Counters for Counters.Counter;

    NftFactory nftFactory;
    SeascapeNft private nft;
    Counters.Counter private sessionId;

    /// @notice holds session related data. Since event is a solidity keyword, we call them session instead.
    struct Session {
        uint256 period;          // session duration
        uint256 startTime;       // session start in unixtimestamp
        uint256 generation;		 // Seascape Nft generation
        uint256 comboGeneration; // when hit combination Nft's generation
        uint256 interval;   	 // duration between every minting
        uint256 fee;             // amount of CWS token to spend to mint a new nft
        uint256 minStake;        // minimum amount of crowns deposit, only for staking
        uint256 maxStake;        // maximum amount of crowns deposit, only for staking
    }
    /// @notice keeps track of balances for each user
    struct Balance {
	      uint256 totalStaked;    // amount of crowns staked
        uint256 mintedTime;     // track minted time per address
    }

    /// @notice Tracking player balance within a game session.
    /// @dev session id =>(wallet address => (Balance struct))
    mapping(uint256 => mapping(address => Balance)) public balances;
    /// @notice each session is a seperate object
    /// @dev session id =>(Session struct)
    mapping(uint256 => Session) public sessions;
    /// session related data
    uint256 public lastSessionId;

    event Minted(
        uint256 indexed sessionId,
        address indexed owner,
        uint256[5] burntNfts,
        uint256 mintedTime,
        uint256 imgId,
        uint256 mintedNft
    );
    event SessionStarted(
        uint256 indexed sessionId,
        uint256 generation,
        uint256 comboGeneration,
        uint256 fee,
        uint256 interval,
        uint256 start_time,
        uint256 end_time,
        uint256 minStake,
        uint256 maxStake
    );
    event Staked(
        uint256 indexed sessionId,
        address indexed owner,
        uint256 amount,
        uint256 totalStaked
    );
    event Withdrawn(
        address indexed owner,
        uint256 indexed sessionId,
        uint256 withdrawnAmount,
        uint256 withdrawnTime
    );
    event FactorySet(address indexed factoryAddress);


    /// @dev set currency addresses
    /// @param _crowns staking currency address
    /// @param _nftFactory nft minting contract address
    /// @param _nft nft fusion contract address
    constructor(address _crowns, address _nftFactory, address _nft) {
        require(_nftFactory != address(0), "nftFactory cant be zero address");

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
        uint256 _comboGeneration,
        uint256 _interval,
        uint256 _fee,
        uint256 _minStake,
        uint256 _maxStake
    )
        external
        onlyOwner
    {
        /// cant start new session when another is active
        if (lastSessionId > 0) {
            require(!isActive(lastSessionId), "another session is still active");
        }
        require(_startTime > block.timestamp, "session should start in future");
        require(_period > 0, "period should be above 0");
        require(_interval > 0 && _interval <= _period,
        "interval should be >0 & <period");
        require(_fee > 0, "fee should be above 0");
        require(_minStake > 0, "minStake should be above 0");
        require(_maxStake > _minStake, "maxStake should be > minStake");

    		//--------------------------------------------------------------------
    		// updating session related data
    		//--------------------------------------------------------------------

        uint256 _sessionId = sessionId.current();
        sessions[_sessionId] = Session(
            _period,
            _startTime+ _period,
            _generation,
            _comboGeneration,
            _interval,
            _fee,
            _minStake,
            _maxStake
        );

        sessionId.increment();
        lastSessionId = _sessionId;

        uint256 end_time = _startTime + _period;

        emit SessionStarted(
            _sessionId,
            _generation,
            _comboGeneration,
            _fee,
            _interval,
            _startTime,
            end_time,
            _minStake,
            _maxStake
        );
    }

    /// @notice spend nfts and cws, burn nfts, mint a higher quality nft and send it to player
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
        uint256 _imgId,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        external
    {
        Session storage _session = sessions[_sessionId];
        Balance storage _balance = balances[_sessionId][msg.sender];

        require(_sessionId > 0, "Session has not started yet");
        require(_nfts.length == 5, "Need to deposit 5 nfts");
        require(_quality >= 1 && _quality <= 5, "Quality value should range 1 - 5");
        require(isActive(_sessionId), "Session not active");
        require(_balance.mintedTime == 0 ||
            (_balance.mintedTime + _session.interval) < block.timestamp,
            "Still in cooldown, try later");
        require(crowns.balanceOf(msg.sender) >= _session.fee, "Not enough CWS in your wallet");

        //--------------------------------------------------------------------
        // spend crowns, burn nfts, mint new nft
        //--------------------------------------------------------------------

        /// @dev make sure that signature of nft matches with the address of the contract deployer
        bytes32 _messageNoPrefix = keccak256(abi.encodePacked(
            _nfts[0],
            _nfts[1],
            _nfts[2],
            _nfts[3],
            _nfts[4],
            _balance.totalStaked,
            _imgId,
            _quality
        ));
        bytes32 _message = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32", _messageNoPrefix));
        address _recover = ecrecover(_message, _v, _r, _s);
        require(_recover == owner(),  "Verification failed");

        /// @dev verify nfts ids and ownership
        for (uint _index=0; _index < 5; _index++) {
            require(_nfts[_index] > 0, "Nft id must be greater than 0");
            require(nft.ownerOf(_nfts[_index]) == msg.sender, "Nft is not owned by caller");
        }
        /// @dev spend crowns
        crowns.spendFrom(msg.sender, _session.fee);
        /// @dev burn nfts
        for (uint _index=0; _index < 5; _index++) {
            nft.burn(_nfts[_index]);
        }
        /// @dev mint new nft
        uint256 mintedNftId = 0;
        if(_balance.totalStaked == _session.maxStake) {
            mintedNftId = nftFactory.mintQuality(msg.sender, _session.comboGeneration, _quality);
        } else {
            mintedNftId = nftFactory.mintQuality(msg.sender, _session.generation, _quality);
        }
        require(mintedNftId > 0, "Failed to mint a token");
        _balance.mintedTime = block.timestamp;
        emit Minted(_sessionId, msg.sender, _nfts, _balance.mintedTime, _imgId, mintedNftId);
    }

    /// @notice stake crowns
    /// @param _sessionId id of active session
    /// @param _amount amount of cws to stake
    function stake(uint256 _sessionId, uint256 _amount) external {
        Session storage _session = sessions[_sessionId];
        Balance storage _balance = balances[_sessionId][msg.sender];

        require(_sessionId > 0, "No active session");
        require(isActive(_sessionId), "Session not active");
        require(_amount > 0, "Should stake more than 0");
        require(_balance.totalStaked + _amount <= _session.maxStake,
            "Cant stake more than maxStake");
        require(_balance.totalStaked + _amount >= _session.minStake,
            "Cant stake less than minStake");
        require(crowns.balanceOf(msg.sender) >= _amount, "Not enough CWS in your wallet");
        crowns.transferFrom(msg.sender, address(this), _amount);

        /// @dev update balance
        balances[_sessionId][msg.sender].totalStaked += _amount;

        emit Staked(_sessionId, msg.sender, _amount,  _balance.totalStaked);
    }

    /// @notice withdraw callers totalStaked crowns
    /// @param _sessionId id of past session
    function withdraw(uint256 _sessionId) external {
        require(!isActive(_sessionId), "Session should be inactive");
        require(balances[_sessionId][msg.sender].totalStaked > 0, "Total staked amount is 0");

        /// update balance first to avoid reentrancy
        uint256 withdrawnAmount = balances[_sessionId][msg.sender].totalStaked;
        delete balances[_sessionId][msg.sender].totalStaked;

        /// transfer crowns second
        crowns.transfer(msg.sender, withdrawnAmount);

        emit Withdrawn(msg.sender, _sessionId, withdrawnAmount, block.timestamp);
    }

    /// @notice return amount of coins staked by _owner
    /// @param _sessionId id of active or past session
    /// @param _owner owner of staked coins
    /// @return token amount
    function totalStakedBalanceOf(
        uint256 _sessionId,
        address _owner
    )
        external
        view
        returns(uint256)
    {
        return balances[_sessionId][_owner].totalStaked;
    }

    /// @dev sets a smartcontract that mints tokens.
    /// @dev the nft factory should give a permission on it's own side to this contract too.
    /// @param _address nftFactory's new address
    function setNftFactory(address _address) external onlyOwner {
        require(_address != address(0), "nftFactory address cant be zero");
        nftFactory = NftFactory(_address);

        emit FactorySet(_address);
    }

    /// @notice check whether session is active or not
    /// @param _sessionId id of session to verify
    /// @return true if session is active
    function isActive(uint256 _sessionId) internal view returns(bool) {
        if (block.timestamp < sessions[_sessionId].startTime || block.timestamp > sessions[_sessionId].startTime + sessions[_sessionId].period) {
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
