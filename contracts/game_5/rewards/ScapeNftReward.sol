pragma solidity 0.6.7;

import "./../interfaces/ZombieFarmInterface.sol";
import "./../interfaces/ZombieFarmRewardInterface.sol";
import "./../../seascape_nft/NftFactory.sol";
import "./../../openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Reward one Scape Nft and some ERC20 token
/// @dev possible reward types:
/// 0 - grand reward
/// non 0 - loot box for the level
contract ScapeNftReward is ZombieFarmRewardInterface {
    /// @notice an address of the factory smartcontract that has a permission to mint Scape NFTs.
    address public factory;

    /// @notice an address of the Zombie Farm smartcontract.
    /// This address is the only address that can execute this Smartcontract functions.
    address public zombieFarm;

    /// @dev The account that keeps all ERC20 tokens
    address public pool;

    // Reward parameters
    struct Params {
        uint256 imgId;
	    uint256 generation;
	    uint8   quality;
        address token;
        uint256 amount;
    }

    // What to give to the user, after completing the Grand reward.
    mapping(uint256 => mapping(uint8 => Params)) public sessionRewards;

    event AddToSession(
        uint256 indexed sessionId,
        uint8 indexed rewardType,
        address indexed token,
        uint256 generation,
        uint8   quality,
        uint256 imgId,
        uint256 amount
    );

    event RewardNft(
        uint256 indexed sessionId,
        uint8 rewardType,
        address indexed owner,
        uint256 indexed nftId,
        address token,
        uint256 generation,
        uint8 quality,
        uint256 imgId,
        uint256 amount
    );

    modifier onlyZombieFarm () {
       require(msg.sender == zombieFarm, "only ZombieFarm can call");
        _;
    }

    constructor (address _factory, address _zombieFarm, address _pool) public {
        require(_factory    != address(0) && _zombieFarm != address(0) && _pool != address(0), "zero_address");

        factory     = _factory;
        zombieFarm  = _zombieFarm;
        pool        = _pool;
    }

    /**
     * @notice Called by the ZombieFarm. The certain reward is prepare for the session's level
     * or prepared as a grand reward for the session.
     * @dev Usually called to link Grand reward to the session. To link level loot boxes to the session
     * its better to call this method name in plural form.
     */
    function addGrandToSession(uint256 sessionId, bytes calldata data)
        external
        override
        onlyZombieFarm
    {
        require(sessionRewards[sessionId][0].amount > 0, "already added");
        require(isValidData(data), "scape reward:isvaliddata failed");

        (uint256 imgId, uint256 generation, uint8 quality, address token, uint256 amount) 
            = abi.decode(data, (uint256, uint256, uint8, address, uint256));

        sessionRewards[sessionId][0] = Params(imgId, generation, quality, token, amount);

        emit AddToSession(sessionId, 0, token, generation, quality, imgId, amount);
    }

    /// @notice Adds the loot boxes for all seasons. It can't add grand reward for the season.
    /// @dev we are not checking anything, since we trust the smartcontracts.
    /// However we check user input.
    function AddLevelToSession(uint256 sessionId, uint8 levelId, bytes calldata data)
        external
        override
        onlyZombieFarm
    {        
        require(isValidData(data), "scape reward:isvaliddata failed");

        (uint256 imgId, uint256 generation, uint8 quality, address token, uint256 amount) =
            abi.decode(data, (uint256, uint256, uint8, address, uint256));

        sessionRewards[sessionId][levelId] = Params(imgId, generation, quality, token, amount);

        emit AddToSession(sessionId, levelId, token, generation, quality, imgId, amount);
    }

    function reward(uint256 sessionId, uint8 rewardType, address owner)
        external
        override
        onlyZombieFarm
    {
        Params storage params = sessionRewards[sessionId][rewardType];

        NftFactory nftFactory = NftFactory(factory);
        IERC20 token = IERC20(params.token);

        uint256 id = nftFactory.mintQuality(owner, params.generation, params.quality);
        require(token.transferFrom(pool, owner, params.amount),
            "transferFrom pool failed");

        emit RewardNft(
            sessionId,
            rewardType,
            owner,
            id,
            params.token,
            params.generation,
            params.quality,
            params.imgId,
            params.amount
        );
    }

    function getLevel(uint8 offset, bytes calldata data)
        external
        override
        view
        onlyZombieFarm
        returns(uint8)
    {
        uint8[5] memory levelId;

        uint256[5] memory imgId;
        uint256[5] memory generation;
        uint8[5] memory quality;
        address[5] memory token;
        uint256[5] memory amount;

        (levelId, imgId, generation, quality, token, amount) = abi
            .decode(data, (uint8[5], uint256[5], uint256[5], uint8[5], address[5], uint256[5]));

        return levelId[offset];
    }

    function isValidData(bytes memory data) public override view onlyZombieFarm returns (bool) {
        uint256 imgId;
        uint256 generation;
        uint8 quality;
        address token;
        uint256 amount;

        (imgId, generation, quality, token, amount) = abi
            .decode(data, (uint256, uint256, uint8, address, uint256));

        if (quality < 1 || quality > 5) {
            return false;
        }
        if (imgId == 0 || amount == 0) {
            return false;
        }

        if (token == address(0)) {
            return false;
        }

        return true;
    }
}
