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


//declare contract + title
contract NftBurning is Ownable, IERC721Receiver{
  using SafeMath for uint256;
  using Counters for Counters.Counter;

  //initialize contracts; factory cws, nft, sessionId
  NftFactory nftFactory;

  IERC20 private crowns;
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

  //session related data
  uint256 public lastSessionId;
  mapping(uint256 => Session) public sessions;


  //sessionId newly created nft owner, burnt nft IDs, minted nft ID, minted nft time
  event Minted(uint256 indexed sessionId, address indexed owner, uint256 burnt_nft_1,
     uint256 burnt_nft_2, uint256 burnt_nft_3, uint256 burnt_nft_4, uint256 burt_nft_5,
     uint256 time, uint256 minted_nft);


  event SessionStarted(uint256 indexed sessionId, uint256 generation, uint256 fee,
      uint256 interval, uint256 start_time, uint256 end_time);

  //new nft factory address
  event FactoryUpdated(address address);


  //instantinate contracts, start session
  constructor(address _crowns, address _nftFactory, address _nft)  public {

    require(_crowns != address(0), "Crowns can't be zero address");
    require(_nftFactory != address(0), "Nft Factory can't be zero address");

    crowns = IERC20(_crowns);
    sessionId.increment(); 	// starts at value 1
    nftFactory = NftFactory(_nftFactory);
    nft = SeascapeNft(_nft);
}


  //starts a new session, during which game would allow players to mint nfts
  function startSession(uint256 _startTime, uint256 _period, uint256 _generation,
    uint256 _interval, uint256 _fee) external onlyOwner {

      //cant start new session when another is active
      if (lastSessionId > 0) {
          require(!isActive(lastSessionId,
          "Seascape Burning: Can't start when session is active");
      }
      //startTime should be greater than current time
      require(_startTime > block.timestamp,
        "Seascape Burning: Seassion should start in the future");
      //period should be greater than 0
      require(_period > 0,
        "Seascape Burning: Session duration should be greater than 0");
      //interval should be greater than 0 and less or equal to period
      require(_interval > 0 && _interval <= _period,
        "Seascape Burning: Interval should be greater than 0 and lower than period");
      //fee should be greater than 0
      require(_fee > 0,
        "Seascape Burning: Fee should be greater than 0");

  		//--------------------------------------------------------------------
  		// updating session related data
  		//--------------------------------------------------------------------
  		uint256 _sessionId = sessionId.current();
  		sessions[_sessionId] = Session(_period, _startTime, _endTime, _generation,
        _interval, _fee);

  		sessionId.increment();
  		lastSessionId = _sessionId;

  		emit SessionStarted(_sessionId, _generation, _fee, _interval, _startTime, _startTime + _period);
    }

    function mint(uint256 sessionId, uint256[5] nfts, uint256 quality,
      uint8 _v, bytes32 _r, bytes32 _s)
      ......



}
