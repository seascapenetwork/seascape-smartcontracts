// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/** @notice The general Token agnostic Staking Contract.
 * You have a pool of reward, that is distributed among users based on their deposits.
 * Use it as a base for Nft Staking or ERC20 token staking contracts.
 * On the nft staking or erc20 token staking contracts,
 * assign the reward token and earning token parameters.
 */
contract Stake {
    uint public constant SCALER = 10**18;

    // The Staking is Time based.
    struct StakePeriod {
        uint startTime;
        uint endTime;
        uint rewardPool;                // amount to distribute  
        uint unit;    		            // reward pool divided to period length. or in other words, reward per second.
        
        uint depositPool;        		// total amount of user deposits.
        
        uint rewardClaimableUnit; 	    // total rewarding interest per staked token since the startTime.
        uint countedClaimable;          // total amount of tokens earned by a one staked token,
        							    // since the beginning of the session
                                        // scaled format.
        uint rewardClaimableTime;       // last time when rewardedUnit and interestUnit were updated
    }

    struct StakeUser {
        uint time;
        uint deposit;        		// amount of deposited
        uint rewardClaimedTime;
        uint rewardClaimed;
    }

    /// @dev namespace => sessionid => Stake period
    mapping(address => mapping(uint => StakePeriod)) public stakePeriods;
    /// @dev namespace => session id => player address = StakeUser
    mapping(address => mapping(uint => mapping(address => StakeUser))) public stakeUsers;

    modifier whenStakePeriodActive (uint key) {
        require(isActive(msg.sender, key), "STAKE_TOKEN:no active period");
	    _;
    }

    modifier validStakePeriodParams(uint key, uint startTime, uint endTime, uint rewardPool) {
        require(startTime >= block.timestamp,                   "STAKE_TOKEN: invalid_start");
        require(startTime < endTime,                            "STAKE_TOKEN: invalid_time");
        require(rewardPool > 0,                                 "STAKE_TOKEN: zero_value");
        require(stakePeriods[msg.sender][key].startTime == 0,   "STAKE_TOKEN: period_exists");
        _;
    }

    modifier updateRewardClaimable(uint key, address stakerAddr) {
        updatePeriodClaimable(key);
        _;
        updatePeriodClaimable(key);

        StakePeriod storage period  = stakePeriods[msg.sender][key];
        StakeUser storage staker    = stakeUsers[msg.sender][key][stakerAddr];
 
  		updateUserClaimable(period.countedClaimable, staker);
    }

    event NewStakePeriod(address indexed namespace, uint key, uint startTime, uint endTime);
    event Deposit(address indexed namespace, address indexed staker, uint indexed key, uint amount);
    event Withdraw(address indexed namespace, address indexed staker, uint indexed key, uint amount);
    event Reward(address indexed namespace, address indexed staker, uint indexed key, uint amount);

    constructor () public {}

    /// @notice a new staking period for the smartcontract.
    function newStakePeriod(
        uint key,               // a unique identifier. could be a session id.
        uint startTime,
        uint endTime,
        uint rewardPool         // if usdc, then decimals is 9 for reward pool.
                                // if cws, then decimals is 18 for reward pool.
    )
        internal 
        validStakePeriodParams(key, startTime, endTime, rewardPool)
    {
        // Challenge.stake is not null, means that earn is not null too.
        StakePeriod storage period  = stakePeriods[msg.sender][key];
        period.rewardPool           = rewardPool;
        period.startTime            = startTime;
        period.endTime              = endTime;
        period.unit                 = rewardPool * SCALER / (endTime - startTime);
        period.rewardClaimableTime  = startTime;

        emit NewStakePeriod(msg.sender, key, startTime, endTime);
    }

    //-------------------------------------------------------------------
    //
    // The User interactions
    //
    //-------------------------------------------------------------------

    /// @dev The ZombieFarm calls this function when the session is active only.
    function deposit(uint key, address stakerAddr, uint amount)
        internal
        whenStakePeriodActive(key)
        updateRewardClaimable(key, stakerAddr)
    {
        require(amount > 0,     "STAKE_TOKEN: zero_value");

        /// Session Parameters
        StakePeriod storage period   = stakePeriods[msg.sender][key];
        StakeUser storage staker   = stakeUsers[msg.sender][key][stakerAddr];

        _reward(key, stakerAddr);

        period.depositPool  += amount;
        staker.deposit      += amount;
        staker.time         = block.timestamp;

        //
        // Here another smartcontract needs to transfer tokens to the vault.
        //

		emit Deposit(msg.sender, stakerAddr, key, amount);
    }

    function withdraw(uint key, address stakerAddr, uint amount)
        internal
        updateRewardClaimable(key, stakerAddr)
    {
        /// Player parameters
        StakeUser storage staker = stakeUsers[msg.sender][key][stakerAddr];
        require(amount > 0 && staker.deposit >= amount, "STAKE_TOKEN: stake amount zero");

  		_reward(key, stakerAddr);

        staker.time = block.timestamp;
        // deducting from the over stake. do not touching the main part.
        staker.deposit -= amount;
        StakePeriod storage period = stakePeriods[msg.sender][key];
        period.depositPool -= amount;

        //
        // Here another smartcontract needs to transfer from vault user.
        //

        emit Withdraw(msg.sender, stakerAddr, key, amount);
    }

    function reward(uint key, address stakerAddr)
        internal
        updateRewardClaimable(key, stakerAddr)
        returns(uint)
    {
        /// Session Parameters
        StakePeriod storage period = stakePeriods[msg.sender][key];
        require(period.startTime > 0, "session does not exist");

        /// Player parameters
        StakeUser storage staker = stakeUsers[msg.sender][key][stakerAddr];
        require(staker.deposit > 0, "stake amount zero");

        // before updating player's challenge parameters, we auto-claim earned tokens till now.
        return _reward(key, stakerAddr);
    }

    //-------------------------------------------------------------------
    //
    // Tracking the user stake calculations
    //
    //-------------------------------------------------------------------

    /// @dev Sets reward claimable amount for this period till this time.
    /// Reward claimable per deposited value.
    function updatePeriodClaimable(uint key)
        internal
        returns(bool)
    {
        StakePeriod storage period      = stakePeriods[msg.sender][key];
        uint sessionCap                 = getPeriodTime(period.startTime, period.endTime);

        // I record that interestUnit is 0.1 CWS (unit/amount) in session.interestUnit
        // I update the session.interestUpdate to now
        if (period.depositPool == 0) {
            period.rewardClaimableUnit = period.unit;
        } else {
            period.rewardClaimableUnit = period.unit / period.depositPool;
             // 0.1
        }

        // I calculate previous claimed rewards
        period.countedClaimable = period.countedClaimable + ((sessionCap - period.rewardClaimableTime) * period.rewardClaimableUnit);

        // we avoid sub. underflow, for calulating countedClaimable
        period.rewardClaimableTime = sessionCap;

        return true;
    }


    function updateUserClaimable(
        uint countedClaimable,
        StakeUser storage staker
    )
        internal
        returns(bool)
    {
        staker.rewardClaimed = countedClaimable * staker.deposit / SCALER;
    }

    function _claim(uint key, address stakerAddr, uint interest) internal virtual returns(bool) {}

    function _reward(uint key, address stakerAddr) internal returns(uint) {
        StakePeriod storage period = stakePeriods[msg.sender][key];
        StakeUser storage staker = stakeUsers[msg.sender][key][stakerAddr];

        if (staker.deposit == 0) {
            return 0;
        }

        uint interest = claimable(msg.sender, key, stakerAddr);
        if (interest == 0) {
            return 0;
        }

        // we avoid sub. underflow, for calulating session.rewardedUnit
        staker.rewardClaimedTime = getPeriodTime(period.startTime, period.endTime);

        _claim(key, stakerAddr, interest);

        //
        // Here another smartcontract should transfer reward token to the user.
        //

        emit Reward(msg.sender, stakerAddr, key, interest);

        return interest;
    }

    function claimable(address namespace, uint key, address stakerAddr)
        public
        view
        returns(uint)
    {
        StakePeriod storage period = stakePeriods[namespace][key];
        StakeUser storage staker = stakeUsers[namespace][key][stakerAddr];

    	// How much of total deposit is belong to player as a floating number
    	if (staker.deposit == 0 || period.depositPool == 0) {
            return 0;
    	}

        uint sessionCap = getPeriodTime(period.startTime, period.endTime);

        if (sessionCap == period.endTime && staker.rewardClaimedTime >= sessionCap) {
            return 0;
        }

        uint rewardedUnit = period.countedClaimable + (
            (sessionCap - period.rewardClaimableTime) * period.rewardClaimableUnit);

        return ((staker.deposit * rewardedUnit) / SCALER) - staker.rewardClaimed;
    }

    //----------------------------------------------------------------
    //
    // StakePeriod time functions
    //
    //----------------------------------------------------------------

    function getPeriodTime(uint startTime, uint endTime) internal view returns(uint) {
        if (!isActive(startTime, endTime)) {
            if (block.timestamp < startTime) {
                return startTime;
            }
            return endTime;
        }

        return block.timestamp;
    }

    function isActive(uint startTime, uint endTime) internal view returns(bool) {
        if (startTime == 0) {
            return false;
        }

        return (block.timestamp >= startTime && block.timestamp <= endTime);
    }

    /**
     * @dev session.startTime <= current time <= session.endTime
     */
    function isActive(address namespace, uint key) public view returns(bool) {
        if (key == 0) return false;

        StakePeriod storage period = stakePeriods[namespace][key];
        return (block.timestamp >= period.startTime && block.timestamp <= period.endTime);
    }

    /**
     * @dev current time <= session.endTime
     */
    function initiated(address namespace, uint key) public view returns(bool) {
        if (key == 0) return false;

        StakePeriod storage period = stakePeriods[namespace][key];
        return (block.timestamp <= period.endTime);
    }
}
