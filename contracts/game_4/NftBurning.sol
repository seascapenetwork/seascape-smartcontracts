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



//declare contract + title
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

  // session related data
  uint256 public lastSessionId;
  mapping(uint256 => Session) public sessions;

  // track minted time per address
  mapping(address => uint256) public mintedTime;

  // sessionId newly created nft owner, burnt nft IDs, minted nft ID, minted nft time
  event Minted(uint256 indexed sessionId, address indexed owner, uint256 burnt_nft_1,
     uint256 burnt_nft_2, uint256 burnt_nft_3, uint256 burnt_nft_4, uint256 burt_nft_5,
     uint256 time, uint256 minted_nft);


  event SessionStarted(uint256 indexed sessionId, uint256 generation, uint256 fee,
      uint256 interval, uint256 start_time, uint256 end_time);

  // new nft factory address
  event FactorySet(address indexed factoryAddress);


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



  // starts a new session, during which game would allow players to mint nfts
  function startSession(uint256 _startTime, uint256 _period, uint256 _generation,
    uint256 _interval, uint256 _fee) external onlyOwner {

      // cant start new session when another is active
      if (lastSessionId > 0) {
          require(!isActive(lastSessionId), "Another session is already active");
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

  		//--------------------------------------------------------------------
  		// updating session related data
  		//--------------------------------------------------------------------
  		uint256 _sessionId = sessionId.current();
  		sessions[_sessionId] = Session(_period, _startTime, _startTime+ _period,
        _generation, _interval, _fee);

  		sessionId.increment();
  		lastSessionId = _sessionId;

  		emit SessionStarted(_sessionId, _generation, _fee, _interval, _startTime, _startTime + _period);
    }


    // spend 5 nfts and 1 cws, burn nfts, mint a higher quality nft and send it to player
    function mint(uint256 _sessionId, uint256[5] calldata _nfts, uint8 _quality,
      uint8 _v, bytes32 _r, bytes32 _s) external {

        Session storage _session = sessions[_sessionId];
        //Balance storage _mintedTime = mintedTime[msg.sender];

        require(_sessionId > 0, "Session has not started yet");
        require(_nfts.length == 4, "Need to deposit 5 nfts");
        require(_quality >= 1 && _quality <= 5,
            "Seascape Burning: Incorrect quality");
        require(isActive(_sessionId), "Game session is already finished");
        require(mintedTime[msg.sender] == 0 ||
          (mintedTime[msg.sender].add(_session.interval) < block.timestamp),
          "Still in locking period, try again later");

        //TODO: make sure that all nfts are owned by the function caller.
        /*TODO: make sure that signature of (nft_1, nft_2, nft_3, nft_4, nft_5, quality)
         matches with the address of the contract deployer.*/
        require(crowns.balanceOf(msg.sender) >= sessions[_sessionId].fee,
            "Not enough CWS, please check your CWS balance");


        //--------------------------------------------------------------------
    		// burn nfts, spend crowns, mint nft
    		//--------------------------------------------------------------------

        require(crowns.spendFrom(msg.sender, sessions[_sessionId].fee),
            "Failed to spend CWS");
        /* nft.safeTransferFrom(msg.sender, address(this), _nfts);
        nft.burn(_nfts); */


        uint256 mintedNftId = nftFactory.mintQuality(msg.sender, _session.generation, _quality);
        require(mintedNftId > 0, "failed to mint a token");
        mintedTime[msg.sender] = block.timestamp;
        emit Minted(_sessionId, msg.sender, _nfts[0], _nfts[1], _nfts[2], _nfts[3],
          _nfts[4], now, mintedNftId);
    }


    /* function checkAllSlots(uint256[5] _nfts) internal {
      // TODO: check that all slots are full
      require(_nftId > 0, "Nft Staking: Nft id must be greater than 0");
      require(nft.ownerOf(_nftId) == msg.sender, "Nft is not owned by caller");

      bytes32 _messageNoPrefix = keccak256(abi.encodePacked(_nftId, _sp));
      bytes32 _message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageNoPrefix));
      address _recover = ecrecover(_message, _v, _r, _s);
      require(_recover == owner(),  "Nft Staking: Seascape points verification failed");
    } */

    /// @dev sets an nft factory, a smartcontract that mints tokens.
    /// the nft factory should give a permission on it's own side to this contract too.
    function setNftFactory(address _address) external onlyOwner {
    require(_address != address(0), "Seascape Staking: Nft Factory address can not be be zero");
    nftFactory = NftFactory(_address);

    emit FactorySet(_address);
    }


    /// @notice Returns true if session is active
    function isActive(uint256 _sessionId) internal view returns(bool) {
	    if (now > sessions[_sessionId].startTime + sessions[_sessionId].period) {
	        return false;
	    }

	    return true;
    }

    /// @dev encrypt token data
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
