pragma solidity 0.6.7;

import "./ZombieFarmRewardInterface.sol";
import "./../seascape_nft/NftFactory.sol";
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Reward a Scape Nft with certain ERC20 token
/// @dev possible reward types:
/// 0 - grand reward
/// non 0 - loot box for the level
contract ScapeNftReward is ZombieFarmRewardInterface {

    address public factory;
    address public zombieFarm;
    /// @dev The account that keeps all ERC20 tokens
    address public pool;

    struct Params {
        uint256 imgId;
	      uint256 generation;
	      uint8 quality;
        address token;
        uint256 amount;
    }

    mapping(uint256 => mapping(uint16 => Params)) public sessionRewards;

    event SaveReward(
        uint256 indexed sessionId,
        uint16 indexed rewardType,
        address indexed token,
        uint256 generation,
        uint8 quality,
        uint256 imgId,
        uint256 amount
    );

    event RewardNft(
        uint256 indexed sessionId,
        uint16 rewardType,
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
        require(_factory != address(0), "invalid _factory address");
        require(_zombieFarm != address(0), "invalid _zombieFarm address");
        require(_pool != address(0), "invalid _pool address");

        factory = _factory;
        zombieFarm = _zombieFarm;
        pool = _pool;
    }

    function saveReward(uint256 sessionId, uint8 rewardType, bytes calldata data)
        external
        override
        onlyZombieFarm
    {
        require(isValidData(data), "scape reward:isvaliddata failed");

        uint256 imgId;
        uint256 generation;
        uint8 quality;
        address token;
        uint256 amount;

        (imgId, generation, quality, token, amount) = abi
            .decode(data, (uint256, uint256, uint8, address, uint256));

        sessionRewards[sessionId][rewardType] = Params(imgId, generation, quality, token, amount);

        emit SaveReward(sessionId, rewardType, token, generation, quality, imgId, amount);
    }

    /// @notice a new challenge of this challenge category was added to the Season.
    /// Adds a level rewards. It can't add grand reward for the season.
    function saveRewards(uint256 sessionId, uint8 rewardAmount, bytes calldata data)
        external
        override
        onlyZombieFarm
    {
        uint8[5] memory levelId;

        uint256[5] memory imgId;
        uint256[5] memory generation;
        uint8[5] memory quality;
        address[5] memory token;
        uint256[5] memory amount;

        (levelId, imgId, generation, quality, token, amount) =
            abi.decode(data, (uint8[5], uint256[5], uint256[5], uint8[5], address[5], uint256[5]));

        for (uint8 i = 0; i < rewardAmount; i++) {
            sessionRewards[sessionId][levelId[i]] = Params(
                imgId[i], generation[i], quality[i], token[i], amount[i]);

            emit SaveReward(
                sessionId,
                levelId[i],
                token[i],
                generation[i],
                quality[i],
                imgId[i],
                amount[i]
            );
        }
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
