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
    
    bytes32 public constant STATIC_ROLE = keccak256("STATIC");
    bytes32 public constant GENERATOR_ROLE = keccak256("GENERATOR");

    LotteryTicket internal ticket_;
    Counters.Counter private lotteryId_;

    uint8 public sizeOfLottery_;    // how many numbers in one lottery ticket (should be 5)
    uint16 public maxValidRange_;   // max of each lottery numbers, start at 0 (should be 9)

    enum Status {
        NotStarted,                 // lottery has not started yet
        Open,                       // lottery is open for ticket purchases
        Closed,                     // lottery is no longer open for ticket purchases and wait for drawing
        Completed                   // lottery has been closed and the numbers drawn
    }

    struct LotteryRound {
        uint256 lotteryId;          // id for this round
        Status lotteryStatus;       // status of this round
        uint256 prizePool;          // the amount of cws for prize money
        uint256 ticketPrize;        // cost per ticket in cws
        uint8[] prizeDistribution;  // the distribution for prize money
        uint256 startTime;          // block timestamp for start of this round
        uint256 closeTime;          // block timestamp for end of this round
        uint16[] winningNumbers;    // the winning numbers
    }

    // Lottery id to round detail
    mapping(uint256 => LotteryRound) internal allLotterys_;

    //-------------------------------------------------------------------------
    // EVENTS
    //-------------------------------------------------------------------------
    event TicketMinted (
        address indexed minter,
        uint256[] ticketIds,
        uint16[] numbers,
        uint256 totalCost
    );

    event LotteryOpen (
        uint256 lotteryId,
        uint256 ticketSupply
    );

    event LotteryClose (
        uint256 lotteryId,
        uint256 ticketSupply
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
        uint8 _sizeOfLotteryNumbers,
        uint16 _maxValidNumberRange
    ) public {
        require(_cws != address(0), "Cws contract cannot be 0 address");
        require(_sizeOfLotteryNumbers != 0 && _maxValidNumberRange != 0, "Lottery setup cannot be 0");

        setCrowns(_cws);
        sizeOfLottery_ = _sizeOfLotteryNumbers;
        maxValidRange_ = _maxValidNumberRange;
    }

    //-------------------------------------------------------------------------
    // STATE MODIFYING FUNCTIONS 
    //-------------------------------------------------------------------------
    
    function startSession() external onlyOwner returns(uint256 sessionId) {
        
    }
    
    function createNewRound(
        uint8[] calldata _prizeDistribution,
        uint256 _prizePoolInCws,
        uint256 _ticketPrize,
        uint256 _startTime,
        uint256 _endTime
    ) external onlyOwner returns(uint256 lotteryId) {
        require(_prizeDistribution.length == sizeOfLottery_, "Invalid distribution length");

        uint256 prizeDistrubutionTotal = 0;
        for(uint256 i = 0; i < _prizeDistribution.length; i++) {
            prizeDistrubutionTotal = prizeDistrubutionTotal.add(uint256(_prizeDistribution[i]));
        }

        require(prizeDistrubutionTotal == 100, "Prize distrubution is not 100");
        require(_prizePoolInCws > 0 && _ticketPrize > 0, "Prize or ticket price cannot be 0");
        require(_startTime != 0 && _startTime < _endTime, "Timestamps for lottery invalid");

        //lotteryId_.increment();
        uint16[] memory winningNumbers = new uint16[](sizeOfLottery_);
        Status lotteryStatus;

        // if (lotteryId_ > 0) {
        //     require(!isActive(lastSessionId), "another session is still active");
        // }
        // require(_startTime > block.timestamp, "session should start in future");
        // require(_period > 0, "period should be above 0");
        // require(_interval > 0 && _interval <= _period,
        // "interval should be >0 & <period");
        // require(_fee > 0, "fee should be above 0");
        // require(_minStake > 0, "minStake should be above 0");
        // require(_maxStake > _minStake, "maxStake should be > minStake");

        
    //  if(_startTime >= getCurrentTime()) {

    //  }
    }
}