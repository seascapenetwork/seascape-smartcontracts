pragma solidity ^0.6.7;

import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./FarmInterface.sol";

/**
    @notice The holder of all tokens of the players from the Defi mini games.
    It can farm them if its possible.
 */
contract SeascapeHodl is Ownable {

    /// @notice The game contract addresses.
    mapping(address => bool) public games;

    /// @notice The staking token mapped to the Farming Contract
    /// If farming contract is not set, then staking token is hodled in this contract
    mapping(address => address) public maps;

    /// @notice the balance of stakes of each player
    mapping(address => mapping(address => uint256)) public balances;

    modifier onlyGame {
        require(games[msg.sender], "No game contract");
        _;
    }

    constructor (address _tester) public {
        games[_tester] = true;
    }

    function setGame(address _game) external onlyOwner {
        games[_game] = true;
    }

    function unsetGame(address _game) external onlyOwner {
        games[_game] = false;
    }

    /// @notice It maps the token to the farming contract.
    /// @param _stake the token that is staked by the user.
    /// @param _farm the contract that farms the token.
    function setStake(address _stake, address _farm) external onlyOwner {
        maps[_stake] = _farm;
    }

    /// @notice It unmaps the token from the farming contract.
    /// @param _stake the token that is mapped for farming
    function unsetStake(address _stake) external onlyOwner {
        require(maps[_stake] != address(0), "Unset already");

        FarmInterface farm = FarmInterface(maps[_stake]);
        farm.withdrawAll();

        maps[_stake] = address(0);
    }

    /// @notice the game transfers tokens of the user.
    function deposit(address _stake, uint256 _amount, address _staker) external onlyGame {
        IERC20 token = IERC20(_stake);
        token.transferFrom(_staker, address(this), _amount);

        /// If farming mapped, then farms.
        if (maps[_stake] != address(0)) {
            FarmInterface farm = FarmInterface(maps[_stake]);
            require(farm.deposit(_amount), "failed to farm");
        }

        balances[msg.sender][_staker] = balances[msg.sender][_staker] + _amount;
    }

    /// @notice the game transfers tokens of the user back to him.
    function withdraw(address _stake, uint256 _amount, address _staker) external onlyGame {
        /// If farming mapped, then takes out from farm.
        /// Otherwise, from this contract

        /// If farming mapped, then farms.
        if (maps[_stake] != address(0)) {
            FarmInterface farm = FarmInterface(maps[_stake]);
            require(farm.withdraw(_amount), "failed to withdraw");
        }

        IERC20 token = IERC20(_stake);
        token.transferFrom(_staker, address(this), _amount);

        balances[msg.sender][_staker] = balances[msg.sender][_staker] + _amount;
    }
}