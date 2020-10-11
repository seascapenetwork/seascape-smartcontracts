pragma solidity 0.6.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Staking is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public CWS;

    struct Session {
	uint256 id;
    }
    
    constructor(IERC20 _CWS) public {
	CWS = _CWS;
    }

    //--------------------------------------------------
    // Only owner
    //--------------------------------------------------

    /// @notice Withdraws CWS tokens used outside of Crowns
    /// @param rings The number of rings from dendrochronological sample
    /// @return age in years, rounded up for partial years
    function withdrawCWS() external onlyOwner {
    }

    /// @notice Starts a staking session for a finit @param _period of
    /// time, starting from @param _startTime. The @param _totalReward of
    /// CWS tokens will be distributed in every block. It allows to claim a
    /// Seascape NFT of in @param _generation Generation.
    function startSession(IERC20 _stakingToken,
			  uint256 _totalReward,
			  uint256 _period,
			  uint256 _startTime,
			  uint256 _generation) external onlyOwner {

    }

    /// @notice Sets a NFT factory that will mint a token for stakers
    function setNFTFactory(address _address) external onlyOwner {

    }


    //--------------------------------------------------
    // Only staker
    //--------------------------------------------------

    /// @notice Deposits @param _amount of LP token
    /// of type @param _token into Staking contract.
    function deposit(IERC20 _token, uint256 _amount) external {

    }

    /// @notice Withdraws Earned CWS tokens from staked LP token
    /// of type @param _token
    function claim(IERC20 _token) external {

    }

    /// @notice Withdraws @param _amount of LP token
    /// of type @param _token out of Staking contract.
    function withdraw(IERC20 _token, uint256 _amount) external {

    }

    /// @notice Mints an NFT for staker. One NFT per session, per token.
    function claimNFT(IERC20 _token, uint256 _sessionID) external {

    }


    //--------------------------------------------------
    // Public methods
    //--------------------------------------------------

    /// @notice Returns last session info by a @param _token for staking
    function sessionFor(IERC20 _token) external view returns(uint256) {
	return id;
    }

    /// @notice Returns amount of Token staked by @param _address
    function stakedBalanceOf(address _address, uint256 _sessionID) external view returns(uint256) {
	return 0;
    }

    /// @notice Returns amount of CWS Tokens earned by @param _address
    /// in the @param _sessionID
    function earned(address _address, uint256 _sessionID) external view returns(uint256) {
	return 0;
    }

    /// @notice Returns amount of CWS Tokens that @param _address could claim.
    function claimable(address _address, uint256 _sessionID) external view returns(uint256) {
	return 0;
    }

    /// @notice Returns total amount of Staked LP Tokens in a @param _sessionID
    function stakedBalance(uint256 _sessionID) external view returns(uint256) {
	return 0;
    }
}


