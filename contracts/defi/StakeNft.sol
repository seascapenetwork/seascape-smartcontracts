pragma solidity 0.6.7;

import "./Stake.sol";
import "./../game_5/helpers/VaultHandler.sol";
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./../openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./../openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @dev The core functionality of the DeFi.
/// This is Stake erc721/native, and earn another erc20/native currency.
/// It has two isolation groups:
/// Per smartcontract, per session.
/// Every smartcontract's staking is isolated from another smartcont stakings.
/// For staking of smartcontract, smartcontract can initialize as many periods, as he wants.
contract StakeNft is ReentrancyGuard, VaultHandler, Stake, IERC721Receiver {
    using SafeERC20 for IERC20;

    struct Period {
        address stakeToken;         // the nft address
        address rewardToken;
    }
    mapping(address => mapping(uint => Period)) public periods;
    mapping(address => mapping(uint => mapping(uint => uint))) public weights;
    mapping(address => mapping(uint => mapping(uint => address))) public owners;     // only transfer to the owner

    event NewPeriod(address indexed namespace, uint key, address indexed stakeToken, address indexed rewardToken, uint startTime, uint endTime);

    constructor () public {}

    /// @notice a new staking period in the namespace of this method caller.
    function newPeriod(
        uint key,
        address stakeToken,
        address rewardToken,
        uint startTime,
        uint endTime,
        uint rewardPool
    )
        external
    {
        if (rewardToken != address(0)) {
            require(IERC20(rewardToken).decimals() == 18, "DECIMAL_WEI");
        }
        require(stakeToken != address(0), "STAKE_TOKEN: zero_address");

        newStakePeriod(key, startTime, endTime, rewardPool);

        // Challenge.stake is not null, means that earn is not null too.
        Period storage period       = periods[msg.sender][key];
        period.stakeToken           = stakeToken;
        period.rewardToken          = rewardToken;

        emit NewPeriod(msg.sender, key, stakeToken, rewardToken, startTime, endTime);
    }

    /// @dev The ZombieFarm calls this function when the session is active only.
    function stake(uint key, address stakerAddr, uint id, uint amount)
        external
        nonReentrant
    {
        require(amount > 0,     "STAKE_TOKEN: zero_value");

        /// Transfer tokens to the Smartcontract
        Period storage period       = periods[msg.sender][key];

        IERC721 nft = IERC721(period.stakeToken);
        require(nft.ownerOf(id) == stakerAddr, "not owned");

        weights[msg.sender][key][id] = amount;
        owners[msg.sender][key][id] = stakerAddr;

        nft.safeTransferFrom(stakerAddr, address(this), id);

        deposit(key, stakerAddr, amount);
    }

    function unstake(uint key, address stakerAddr, uint id, bool burn)
        external
        nonReentrant
    {
        address stakeToken = periods[msg.sender][key].stakeToken;
        IERC721 nft = IERC721(stakeToken);

        require(nft.ownerOf(id) == address(this), "not owned");
        require(owners[msg.sender][key][id] == stakerAddr);

        delete owners[msg.sender][key][id];
        delete weights[msg.sender][key][id];

        if (burn) {
            nft.safeTransferFrom(address(this), stakerAddr, id);
        } else {
            nft.safeTransferFrom(address(this), 0x000000000000000000000000000000000000dEaD, id);
        }

        withdraw(key, stakerAddr, weights[msg.sender][key][id]);
    }

    function claim(uint key, address stakerAddr)
        external
        nonReentrant
        returns(uint)
    {
        return reward(key, stakerAddr);
    }

    function _claim(uint key, address stakerAddr, uint interest) internal override returns(bool) {
        address rewardToken = periods[msg.sender][key].rewardToken;
        
        if (rewardToken == address(0)) {
            payable(stakerAddr).transfer(interest);
            return true;
        }
        IERC20 _token = IERC20(rewardToken);
        uint contractBalance = _token.balanceOf(vault);
        require(contractBalance > interest, "Insufficient balance of reward");
        IERC20(_token).safeTransferFrom(vault, stakerAddr, interest);
        
        return true;
    }
    
    receive() external payable {
        // React to receiving ether
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
