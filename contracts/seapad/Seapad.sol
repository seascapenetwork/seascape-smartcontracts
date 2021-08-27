pragma solidity ^0.6.7;

import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SeapadAuction.sol";
import "./SeapadPrefund.sol";
import "./../crowns/erc-20/contracts/CrownsToken/CrownsToken.sol";

/**
 * @title Seapad
 * @notice The Seapad Manager of tokens by Seascape Network team, investors.
 * It distributes the tokens to the game devs.
 * 
 * This smartcontract gets active for a project, only after its prefunding is finished.
 *
 * This smartcontract determines how much PCC (Player created coin) the investor would get, 
 * and an amount of compensation in case PCC failure.
 * The determination is described as a Seapad NFT.
 */
contract Seapad is Ownable {
    SeapadAuction private seapadAuction;
    SeapadPrefund private seapadPrefund;
    CrownsToken private crowns;

    uint256 private constant SCALER = 10 ** 18;

    struct Project {
        uint256 prefundPool;            // The PCC pool for prefund investors
        uint256 auctionPool;            // The PCC pool for auction participants
        uint256 prefundCompensation;    // The Crowns that prefunders could get
        uint256 auctionCompensation;    // The Crowns that auction participants could get

        uint256 pool;                   // The total pool of tokens that users could get
        uint256 compensation;           // The total compensation of tokens that users could get
        address pcc;                    // The Game token that users are invested for
        address lighthouse;             // The nft dedicated for the project.

        uint256 startTime;              // The time when Token management starts. Its the endTime of SeapadAuction
    }

    mapping(uint256 => Project) public projects;

    /// Tracking NFT of each investor in every project.
    /// One investor can mint one nft for project.
    mapping(uint256 => mapping(address => uint256)) public nftIds;

    event AddProject(uint256 indexed projectId, uint256 prefundPool, uint256 auctionPool, uint256 prefundCompensation, uint256 auctionCompensation, address indexed lighthouse, uint256 startTime);
    event AddPCC(uint256 indexed projectId, address indexed pcc);

    constructor(address _seapadAuction, address _seapadPrefund, address _crowns) public {
        require(_seapadAuction != address(0) && _crowns != address(0) && _seapadPrefund != address(0), "Seapad: ZERO_ADDRESS");

        seapadAuction = SeapadAuction(_seapadAuction);
        seapadPrefund = SeapadPrefund(_seapadPrefund);
        crowns = CrownsToken(_crowns);
    }

    /// @notice add a new project to the IDO project.
    function addProject(uint256 projectId, uint256 prefundPool, uint256 auctionPool, uint256 prefundCompensation, uint256 auctionCompensation, uint256 startTime, address lighthouse) external onlyOwner {
        require(projectId > 0 && prefundPool > 0 && auctionPool > 0 && prefundCompensation > 0 && auctionCompensation > 0, "Seapad: ZERO_PARAMETER");
        require(lighthouse != address(0), "Seapad: ZERO_ADDRESS");
        require(projects[projectId].startTime == 0, "Seapad: ALREADY_STARTED");
        require(startTime > 0, "Seapad: ZERO_PARAMETER");

        uint256 auctionEndTime = seapadAuction.getEndTime(projectId);
        require(auctionEndTime > 0, "Seapad: NO_AUCTION_END_TIME");
        require(startTime >= auctionEndTime, "Seapad: START_TIME_BEFORE_AUCTION_END");

        Project storage project = projects[projectId];
        
        uint256 totalPool;
        uint256 totalInvested;
        
        (totalPool, totalInvested) = seapadPrefund.getTotalPool(projectId);
        
        // Remained part of tokens that are not staked are going to auction pool
        if (totalInvested < totalPool) {
            uint256 percent = (totalPool - totalInvested) / (totalPool / 100);

            auctionPool = auctionPool + (prefundPool / 100 * percent);
            prefundPool = prefundPool - (prefundPool / 100 * percent);

            auctionCompensation = auctionCompensation + (prefundCompensation / 100 * percent);
            prefundCompensation = prefundCompensation - (prefundCompensation / 100 * percent);
        }

        project.prefundPool             = prefundPool;
        project.auctionPool             = auctionPool;
        project.prefundCompensation     = prefundCompensation;   
        project.auctionCompensation     = auctionCompensation;
        project.pool                    = prefundPool + auctionPool;
        project.compensation            = prefundPool + auctionCompensation;
        project.lighthouse              = lighthouse;                    
        project.startTime               = startTime;

        emit AddProject(projectId, prefundPool, auctionPool, prefundCompensation, auctionCompensation, lighthouse, startTime);
    }

    function addProjectPcc(uint256 projectId, address pcc) external onlyOwner {
        require(projectId > 0, "Seapad: PROJECT_NOT_EXIST");
        require(pcc != address(0), "Seapad: ZERO_ADDRESS");
        
        Project storage project = projects[projectId];
        require(project.pcc == address(0), "Seapad: ALREADY_ADDED");

        project.pcc = pcc;

        emit AddPCC(projectId, pcc);
    }

    //////////////////////////////////////////////////////////////////////
    //
    // The investor functions
    //
    //////////////////////////////////////////////////////////////////////

    /// @notice After the prefund phase, investors can get a NFT with the weight proportion to their investment.
    function claimNft(uint256 projectId) external {
        /// calculate allocation.

        /// calculation of each alloction
        /*
        prefund per investment = PCC prefund pool / USDC total investment
        prefund per investment * user tier prefixed price

        let prefund pool = 2,000
        let investment = 80,000
        then prefund per investment = 0.025

        let tier 1 price = 1000
        then allocation = 0.025 * 1000 => 25

        let auction pool = 1000
        let auction spent = 10000
        let per spent = 0.1
        let user spent 1000
        then his allocation = 100
        */
    }

    /// 100k, 10k cws, 10:1
    // @todo match to cws, to spend it.
    function burnForPcc(uint256 projectId, uint256 nftId) external {

    }

    // @todo transfer to staking pool PCC in ratio to CWS.                                                                             
    function burnForCws(uint256 projectId, uint256 nftId) external {

    }

    // @todo stake
    // @todo separated contract
    function stake(uint256 projectId, uint256 nftId) external {

    }

    // @todo separated contract
    /// need to ask: could it be any project. or user has to choose a certain project for burning this nft.
    // @todo any nft.
    function burnForProject(uint256 projectId, uint256 nftId, uint256 anotherProjectId) external {

    }

    //////////////////////////////////////////////////////////////////////
    //
    // After funded functions
    //
    //////////////////////////////////////////////////////////////////////

    // do we unlock after achieving milestone or token can be unlocked any time?
    // what happens if milestones are not achieved?
    function unlockInvestment() external {

    }
}