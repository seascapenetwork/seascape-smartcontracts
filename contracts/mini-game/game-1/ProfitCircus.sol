// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./../../scape-nft/NftFactory.sol";
import "./../../defi/StakeToken.sol";

/// @title A Liquidity pool mining
/// @author Medet Ahmetson <admin@blocklords.io>
/// @notice Contract is attached to Seascape Nft Factory
contract ProfitCircus is Ownable {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    uint256 private constant scaler = 10**18;
	
    NftFactory nftFactory;
	address stakeHandler;
  
    Counters.Counter private periodId;

	struct Period {
        uint256 generation;        // Duration after which challenge considered to be completed.
		uint256 stakeAmount;
		uint256 stakePeriod;
		uint256 amount;
    }

    /// @notice balance of lp token that each player deposited to game period
    struct Balance {
		uint256 amount;        		// amount of staked token
		uint256 claimed;       		// amount of claimed reward token
		bool minted;           		// Seascape Nft is claimed or not,
									// for every period, user can claim one nft only

		// Track staking period in order to claim a free nft.
		uint256 stakeTime;			// The time since the latest deposited enough token. It starts the countdown to stake
	}

    mapping(uint256 => Period) public periods;
    mapping(uint256 => mapping(address => Balance)) public balances;
    mapping(uint256 => mapping(address => uint)) public depositTimes;

    event Deposited(address indexed stakingToken, address indexed owner, uint256 periodId, uint256 amount, uint256 startTime, uint256 totalStaked);
    event Claimed(address indexed stakingToken, address indexed owner, uint256 periodId, uint256 amount, uint256 claimedTime);
    event Withdrawn(address indexed stakingToken, address indexed owner, uint256 periodId, uint256 amount, uint256 startTime, uint256 totalStaked);
    event FactorySet(address indexed factoryAddress);	

    constructor(address _nftFactory, address _stake) {
		periodId.increment(); 	// starts at value 1

		nftFactory = NftFactory(_nftFactory);
		stakeHandler = _stake;
    }
    
    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------

    /// @notice Starts a staking period for a finit _period of
    /// time, starting from _startTime. The _totalReward of
    /// Reward tokens will be distributed in every second. It allows to claim a
    /// a _generation Seascape NFT.
    function newPeriod(address _rewardToken, address _lpToken,  uint256 _totalReward, uint256 _period,  uint256 _startTime, uint256 _generation, uint256 _stakeAmount, uint256 _stakePeriod) external onlyOwner {
		require(_lpToken != address(0), "Profit Circus: Staking token should not be equal to 0");
		require(_startTime > block.timestamp, "Profit Circus: Seassion should start in the future");
		require(_period > 0, "Profit Circus: Period duration should be greater than 0");
		require(_totalReward > 0, "Profit Circus: Total reward of tokens should be greater than 0");
		require(_stakeAmount > 0 && _stakePeriod > 0, "Profit Circus: 0 staking requirement");

		//--------------------------------------------------------------------
		// creating the period
		//--------------------------------------------------------------------
		uint256 _periodId = periodId.current();
		periods[_periodId] = Period(_generation, _stakeAmount, _stakePeriod, 0);

		//--------------------------------------------------------------------
        // updating rest of the period related data
		//--------------------------------------------------------------------
		periodId.increment();

		StakeToken handler = StakeToken(payable(stakeHandler));
		handler.newPeriod(_periodId, _lpToken, _rewardToken, _startTime, _startTime + _period, _totalReward);

		// todo
		// emit the newPeriod event
    }
     
    /// @dev sets an nft factory, a smartcontract that mints tokens.
    /// the nft factory should give a permission on it's own side to this contract too.
    function setNftFactory(address _address) external onlyOwner {
		require(_address != address(0), "Profit Circus: Nft Factory address can not be be zero");
		nftFactory = NftFactory(_address);

		emit FactorySet(_address);	    
    }

    //--------------------------------------------------
    // Only game users
    //--------------------------------------------------

    /// @notice deposits _amount of staking token. Staking token could be any ERC20 compatible token
    function stake(uint256 _periodId, uint256 _amount) external {
		require(_amount > 0,          "Profit Circus: Amount to deposit should be greater than 0");
		require(_periodId > 0,       "Profit Circus: Period id should be greater than 0!");
		require(isActive(_periodId), "Profit Circus: Period is not active");

		Period storage _period  = periods[_periodId];
		Balance storage _balance  = balances[_periodId][msg.sender];

		StakeToken handler = StakeToken(payable(stakeHandler));

		// todo
		// check the time when the last staking happened.
		//  if its happening in the same block then no need to claim
		if (_balance.amount > 0) {
			handler.claim(_periodId, msg.sender);
		}

		_balance.amount += _amount;
		_period.amount += _amount;

		handler.stake(_periodId, msg.sender, _amount);

		depositTimes[_periodId][msg.sender]    = block.timestamp;

		updateTimeProgress(_period, _balance);

		// emit the Staking event
		// emit Deposited(_period.stakingToken, msg.sender, _periodId, _amount, block.timestamp, _period.amount);
	}


	function claim(uint256 _periodId) public returns(bool) {
		Balance storage _balance = balances[_periodId][msg.sender];
		require(_balance.amount > 0, "Profit Circus: Not deposited");

		StakeToken handler = StakeToken(payable(stakeHandler));
		handler.claim(_periodId, msg.sender);

		// todo:
		// emit the claim event

		return true;
    }

    /// @notice Withdraws _amount of LP token
    /// of type _token out of Staking contract.
    function unstake(uint256 _periodId, uint256 _amount) external {
		Period storage _period = periods[_periodId];
		Balance storage _balance  = balances[_periodId][msg.sender];

		require(_balance.amount >= _amount, "Profit Circus: Exceeds the balance that user has");

		StakeToken handler = StakeToken(payable(stakeHandler));
			
		_balance.amount -= _amount;
		_period.amount -= _amount;
		_balance.claimed += _amount;

		handler.claim(_periodId, msg.sender);

        handler.unstake(_periodId, msg.sender, _amount);

		updateTimeProgress(_period, _balance);

		// todo emit the unstaking event and claim event
		// emit Withdrawn(_period.stakingToken, msg.sender, _periodId, _amount, block.timestamp, _period.amount);
    }

    /// @notice Mints an NFT for staker. One NFT per period, per token. and should be a deposit
    function claimNft(uint256 _periodId) external {
		// it also indicates that period exists
		Period storage _period = periods[_periodId];
		Balance storage _balance = balances[_periodId][msg.sender];
		require(_balance.claimed + _balance.amount > 0, "Profit Circus: Deposit first");
		require(isMintable(_period, _balance), "Profit Circus: already claimed or time not passed");

		uint256 _tokenId = nftFactory.mint(msg.sender, periods[_periodId].generation);
		require(_tokenId > 0,                              "Profit Circus: failed to mint a token");
		
		balances[_periodId][msg.sender].minted = true;
    }

    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------

    /// @notice Returns amount of Token staked by _owner
    function stakedBalanceOf(uint256 _periodId, address _owner) external view returns(uint256) {
		return balances[_periodId][_owner].amount;
    }

    /// @notice Returns total amount of Staked LP Tokens
    function stakedBalance(uint256 _periodId) external view returns(uint256) {
		return periods[_periodId].amount;
    }

	function isNftClaimable(uint256 _periodId) external view returns(bool) {
		Period storage _period = periods[_periodId];
		Balance storage _balance = balances[_periodId][msg.sender];
		
		// period doesn't exist.
		if (_period.stakeAmount == 0) {
			return false;
		}
		return isMintable(_period, _balance);
	}

    //---------------------------------------------------
    // Internal methods
    //---------------------------------------------------

	function updateTimeProgress(Period storage _period, Balance storage _balance) internal {
		if (_balance.minted) {
			return;
		}

		// If after withdraw or deposit remained more than minimum required tokens
		// progress the timer.
		// otherwise reset it.
        if (_balance.amount >= _period.stakeAmount) {
			if (_balance.stakeTime == 0) {
				_balance.stakeTime = block.timestamp;
			}
        } else {
			_balance.stakeTime = 0;
		}
    }


    /// @dev check whether the period is active or not
    function isActive(uint256 _periodId) internal view returns(bool) {
		StakeToken handler = StakeToken(payable(stakeHandler));
		return handler.isActive(address(this), _periodId);
    }

	/// @dev check whether the time progress passed or not
	function isMintable(Period storage _period, Balance storage _balance) internal view returns(bool) {
		if (_balance.minted) {
			return false;
		}

		uint256 time = 0;

        if (_balance.amount >= _period.stakeAmount && _balance.stakeTime > 0) {
            uint256 duration = block.timestamp - _balance.stakeTime;
            time += duration;
        }

        return time >= _period.stakePeriod;
	}

	// Accept native tokens.
	receive() external payable {
        // React to receiving ether
		payable(msg.sender).transfer(msg.value);
    }
}


