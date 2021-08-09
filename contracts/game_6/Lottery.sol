pragma solidity 0.6.7;

import "./../openzeppelin/contracts/access/AccessControl.sol";
import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/math/SafeMath.sol";
import "./../openzeppelin/contracts/utils/Address.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";

import "./LotteryCrowns.sol";
import "./LotteryTicket.sol";

contract Lottery is AccessControl, Ownable, LotteryCrowns {
    using SafeMath for uint256;
    using Address for address;
    using Counters for Counters.Counter;
    
    bytes32 public constant STATIC_ROLE = keccak256("STATIC");
    bytes32 public constant GENERATOR_ROLE = keccak256("GENERATOR");

    LotteryTicket private ticket;
    Counters.Counter private sessionId;

    uint8 public sizeOfLottery;     // how many numbers in one lottery ticket (should be 5)
    uint16 public maxValidRange;    // max of each lottery numbers, start at 0 (should be 9)
    
    //-------------------------------------------------------------------------
    // SESSION DATA
    //-------------------------------------------------------------------------
    
    // @notice holds session related data
    struct Session {
        uint256 startTime;          // session start in uinx timestamp
        uint256 roundNum;           // how many rounds in one session
        uint256 roundBetTime;       // each round bet time in seconds
        uint256 roundPrizeTime;     // each round get prize time in seconds
    }
    
    // @dev session id => (Session struct)
    mapping(uint256 => Session) public sessions;
    
    uint256 public lastSessionId;
    uint256 public lastSessionStart;
    uint256 public lastSessionEnd;
    uint256 public lastSessionPeriod;
    uint16[] public lastWinningNumbers;
    
    mapping(uint256 => uint16[]) public winningNumbers;
    
    bytes32 internal requestId;
    
    enum Status {
        NotStarted,                 // lottery has not started yet
        Open,                       // lottery is open for ticket purchases
        Closed,                     // lottery is no longer open for ticket purchases and wait for drawing
        Completed                   // lottery has been closed and the numbers drawn
    }

    //-------------------------------------------------------------------------
    // EVENTS
    //-------------------------------------------------------------------------
    
    event TicketMinted (
        address indexed minter,
        uint256[] ticketIds,
        uint16[] numbers,
        uint256 totalCost
    );

    event SessionStarted (
        uint256 indexed sessionId
    );

    event RoundStarted (
        uint256 indexed sessionId,
        uint256 indexed roundId
    );

    //-------------------------------------------------------------------------
    // MODIFIERS
    //-------------------------------------------------------------------------
    
    modifier onlyGenerator() {
        require(isGenerator(msg.sender), "Restricted to random generator.");
        _;
    }
    function isGenerator(address account) public virtual view returns (bool) {
        return hasRole(GENERATOR_ROLE, account);
    }

    modifier notContract() {
        require(!address(msg.sender).isContract(), "contract not allowed");
        require(msg.sender == tx.origin, "proxy contract not allowed");
        _;
    }

    //-------------------------------------------------------------------------
    // CONSTRUCTOR
    //-------------------------------------------------------------------------
    
    constructor(
        address _cws,
        address _ticket,
        uint8 _sizeOfLotteryNumbers,
        uint16 _maxValidNumberRange
    ) public {
        require(_cws != address(0), "Cws contract cannot be 0 address");
        require(_sizeOfLotteryNumbers != 0 && _maxValidNumberRange != 0, "Lottery setup cannot be 0");

        setCrowns(_cws);
        sizeOfLottery = _sizeOfLotteryNumbers;
        maxValidRange = _maxValidNumberRange;
        
        sessionId.increment();  // start session id as 1
        ticket = LotteryTicket(_ticket);
    }
    
    //-------------------------------------------------------------------------
    // VIEW FUNCTIONS
    //-------------------------------------------------------------------------
    
    function isSessionActive(uint256 _sessionId) internal view returns(bool) {
        if(now < sessions[_sessionId].startTime || now > sessions[_sessionId].startTime + ((sessions[_sessionId].roundBetTime + sessions[_sessionId].roundPrizeTime) * sessions[_sessionId].roundNum)) {
            return false;
        }
        return true;
    }

    function currentRoundId() external view returns(uint256 roundId) {
        if(now < lastSessionStart) {
            roundId = 0;
        } else {
            roundId = ((now - lastSessionStart) / lastSessionPeriod) + 1;
            if(roundId > sessions[lastSessionId].roundNum) {
                roundId = sessions[lastSessionId].roundNum;
            }
        }
    }
    
    function currentRoundStatus() external view returns(Status) {
        if(now < lastSessionStart) {
            return Status.NotStarted;
        }
        if(now > lastSessionEnd) {
            return Status.Closed;
        }
        uint256 pastTime = (now - lastSessionStart) % lastSessionPeriod;
        if(pastTime < sessions[lastSessionId].roundBetTime) {
            return Status.Open;
        } else {
            return Status.Completed;
        }
    }
    
    function getWinningNumbers(uint256 _roundId) external view returns(uint16[] memory) {
        return winningNumbers[_roundId];
    }

    //-------------------------------------------------------------------------
    // STATE MODIFYING FUNCTIONS
    //-------------------------------------------------------------------------
    
    function startSession(
        uint256 _startTime,     // when the session start
        uint256 _roundNum,
        uint256 _betTime,
        uint256 _prizeTime
    )
        external
        onlyOwner
    {
        if(lastSessionId > 0) {
            require(!isSessionActive(lastSessionId), "another session is still active");
        }
        require(_startTime > block.timestamp, "session should start in the future");
        require(_roundNum > 0, "round number should above 0");
        require(_betTime > 0, "each round bet time should above 0");
        require(_prizeTime > 0, "each round prize time should above 0");
        
        uint256 _sessionId = sessionId.current();
        sessions[_sessionId] = Session(
            _startTime,
            _roundNum,
            _betTime,
            _prizeTime
        );
        
        sessionId.increment();
        lastSessionId     = _sessionId;
        lastSessionStart  = _startTime;
        lastSessionPeriod = _betTime + _prizeTime;
        lastSessionEnd    = _startTime + (_roundNum * lastSessionPeriod);
        
        emit SessionStarted(
            _sessionId  
        );
    }
    
    function drawNumbers() external onlyOwner() {
        require(lastSessionId > 0, "session not started yet");
        require(now > lastSessionStart && now < lastSessionEnd, "session is end");
        
        uint256 _pastTime = (now - lastSessionStart) % lastSessionPeriod;
        require(_pastTime >= sessions[lastSessionId].roundBetTime, "still in bet period");
        
        uint256 _roundId = ((now - lastSessionStart) / lastSessionPeriod) + 1;
        require(_roundId <= sessions[lastSessionId].roundNum, "max round number reached");
        
        uint16[] memory numbers = new uint16[](sizeOfLottery);
        uint256 _random;
        for(uint i = 0; i < sizeOfLottery; i++) {
            _random = uint256(keccak256(abi.encodePacked(block.timestamp, _roundId, i, block.difficulty)));
            numbers[i] = uint16(_random % 10);
        }
        
        winningNumbers[_roundId] = numbers;
    }
    
    
  
  
  











}