pragma solidity ^0.6.7;

import "./../openzeppelin/contracts/access/Ownable.sol";
import "./../openzeppelin/contracts/utils/Counters.sol";
import "./SeapadTier.sol";

/**
 * @notice This contract initiates the first stage of the Project funding.
 * Users are submittion for the lottery within the given time period for the project.
 * Submission for lottery.
 * 
 * @dev In order to start a new project funding, the first thing to do is add project here.
 */
contract SeapadSubmission is Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private projectId;

    SeapadTier private seapadTier;

    struct Project {
        uint256 startTime;
        uint256 endTime;
        uint256 participants;       // Amount of participants
    }

    mapping(uint256 => Project) public projects;
    mapping(uint256 => mapping(address => bool)) public submissions;
    mapping(uint256 => mapping(uint256 => address)) public participantIds;

    event AddProject(uint256 indexed projectId, uint256 startTime, uint256 endTime);
    event Submit(uint256 indexed projectId, address indexed participant, uint256 indexed submissionId, uint256 submissionTime);

    constructor(address _seapadTier) public {
        require(_seapadTier != address(0), "Seapad: ZERO_ADDRESS");
        projectId.increment(); 	// starts at value 1

        seapadTier = SeapadTier(_seapadTier);
    }

    function totalProjects() external view returns(uint256) {
        return projectId.current();
    }

    /// @notice Opens a submission entrance for a new project
    /// @param startTime of the submission entrance
    /// @param endTime of the submission. This is not th end of the project funding.
    function addProject(uint256 startTime, uint256 endTime) external onlyOwner {
        require(startTime > 0, "Seapad: ZERO_ADDRESS");
        require(now < startTime, "Seapad: TIME_PASSED");
        require(endTime > startTime, "Seapad: INCORRECT_END_TIME");

        uint256 id = projectId.current();
        projects[id].startTime = startTime;
        projects[id].endTime = endTime;

        projectId.increment();

        emit AddProject(id, startTime, endTime);
    }

    /// @notice User registers to join the fund.
    /// @param id is the project id to join
    function submit(uint256 id) external {
        Project storage project = projects[id];

        require(project.startTime > 0, "Seapad: INVALID_PROJECT_ID");
        require(now >= project.startTime, "Seapad: NOT_STARTED_YET");
        require(now <= project.endTime, "Seapad: FINISHED");
        require(submissions[id][msg.sender] == false, "Seapad: SUBMITTED_ALREADY");

        uint8 tierLevel = seapadTier.getTierLevel(msg.sender);
        require(tierLevel > 0, "Seapad: NOT_QUALIFIED");
        
        /// @todo check that tier is usable

        project.participants = project.participants + 1;

        submissions[id][msg.sender] = true;
        participantIds[id][project.participants] = msg.sender;

        emit Submit(id, msg.sender, project.participants, now);
    }

    function getEndTime(uint256 id) external view returns(uint256) {
        if (id == 0 || id <= projectId.current()) {
            return 0;
        }

        return projects[id].endTime;
    }
}