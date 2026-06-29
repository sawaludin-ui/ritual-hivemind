// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Types.sol";
import "./interfaces/IAgentReputation.sol";
import "./interfaces/IHivemindCore.sol";
import "./utils/Owned.sol";
import "./utils/ReentrancyGuardLite.sol";

contract HivemindCore is Owned, ReentrancyGuardLite, IHivemindCore {
    struct Task {
        uint256 id;
        address creator;
        string prompt;
        uint256 bounty;
        uint8 minAgents;
        uint8 maxAgents;
        uint8 minSubmissions;
        uint64 deadline;
        HivemindTypes.TaskStatus status;
        address[] claimedAgents;
        uint256 synthesisId;
    }

    struct Agent {
        address wallet;
        string name;
        string[] capabilities;
        bool active;
    }

    event AgentRegistered(address indexed wallet, string name);
    event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 bounty);
    event TaskClaimed(uint256 indexed taskId, address indexed agent);
    event TaskStatusUpdated(uint256 indexed taskId, HivemindTypes.TaskStatus status);
    event BountyReleased(uint256 indexed taskId, uint256 totalBounty, uint256 recipients);

    error AgentAlreadyRegistered();
    error AgentNotRegistered();
    error InvalidTaskWindow();
    error InvalidBounty();
    error TaskNotFound();
    error TaskNotOpen();
    error TaskExpired();
    error TaskFull();
    error AlreadyClaimed();
    error BountyMismatch();
    error NotAuthorizedExecutor();
    error LengthMismatch();
    error DistributionMismatch();

    mapping(uint256 => Task) private _tasks;
    mapping(address => Agent) private _agents;
    mapping(address => bool) public authorizedExecutors;
    uint256[] private _taskIds;
    uint256 private _taskCount;
    address public reputationContract;

    constructor(address reputationContract_) {
        if (reputationContract_ == address(0)) revert ZeroAddress();
        reputationContract = reputationContract_;
    }

    modifier onlyExecutor() {
        if (!authorizedExecutors[msg.sender]) revert NotAuthorizedExecutor();
        _;
    }

    function setReputationContract(address reputationContract_) external onlyOwner {
        if (reputationContract_ == address(0)) revert ZeroAddress();
        reputationContract = reputationContract_;
    }

    function setAuthorizedExecutor(address executor, bool allowed) external onlyOwner {
        if (executor == address(0)) revert ZeroAddress();
        authorizedExecutors[executor] = allowed;
    }

    function registerAgent(string calldata name, string[] calldata capabilities) external override {
        if (_agents[msg.sender].active) revert AgentAlreadyRegistered();

        Agent storage agent = _agents[msg.sender];
        agent.wallet = msg.sender;
        agent.name = name;
        delete agent.capabilities;
        for (uint256 i = 0; i < capabilities.length; i++) {
            agent.capabilities.push(capabilities[i]);
        }
        agent.active = true;
        IAgentReputation(reputationContract).updateReputation(msg.sender, 0);

        emit AgentRegistered(msg.sender, name);
    }

    function createTask(
        string calldata prompt,
        uint8 minAgents,
        uint8 maxAgents,
        uint8 minSubmissions,
        uint64 deadline
    ) external payable override returns (uint256 taskId) {
        if (msg.value == 0) revert InvalidBounty();
        if (minAgents == 0 || maxAgents < minAgents) revert InvalidTaskWindow();
        // minSubmissions must be reachable: between 1 and minAgents (the guaranteed
        // claimers). 0 is treated as "default to minAgents" for convenience.
        uint8 effectiveMinSubs = minSubmissions == 0 ? minAgents : minSubmissions;
        if (effectiveMinSubs > minAgents) revert InvalidTaskWindow();
        if (deadline <= block.timestamp) revert TaskExpired();

        taskId = ++_taskCount;
        Task storage task = _tasks[taskId];
        task.id = taskId;
        task.creator = msg.sender;
        task.prompt = prompt;
        task.bounty = msg.value;
        task.minAgents = minAgents;
        task.maxAgents = maxAgents;
        task.minSubmissions = effectiveMinSubs;
        task.deadline = deadline;
        task.status = HivemindTypes.TaskStatus.Open;

        _taskIds.push(taskId);

        emit TaskCreated(taskId, msg.sender, msg.value);
    }

    function claimTask(uint256 taskId) external override {
        Task storage task = _tasks[taskId];
        if (task.id == 0) revert TaskNotFound();
        // Claims are accepted while the task is still gathering agents: both Open
        // (below minAgents) and Executing (min reached, slots remain) qualify.
        // This lets a task fill its full min..max window instead of locking at min.
        if (
            task.status != HivemindTypes.TaskStatus.Open &&
            task.status != HivemindTypes.TaskStatus.Executing
        ) revert TaskNotOpen();
        if (task.deadline <= block.timestamp) revert TaskExpired();
        if (!_agents[msg.sender].active) revert AgentNotRegistered();
        if (task.claimedAgents.length >= task.maxAgents) revert TaskFull();
        if (_isClaimed(task.claimedAgents, msg.sender)) revert AlreadyClaimed();

        task.claimedAgents.push(msg.sender);
        // Once enough agents have committed, signal that execution can begin.
        // Status stays Executing while remaining slots (up to maxAgents) fill.
        if (task.claimedAgents.length >= task.minAgents && task.status == HivemindTypes.TaskStatus.Open) {
            task.status = HivemindTypes.TaskStatus.Executing;
        }

        emit TaskClaimed(taskId, msg.sender);
    }

    function markTaskStatus(uint256 taskId, HivemindTypes.TaskStatus status) external override onlyExecutor {
        Task storage task = _tasks[taskId];
        if (task.id == 0) revert TaskNotFound();
        task.status = status;
        emit TaskStatusUpdated(taskId, status);
    }

    function releaseBounty(
        uint256 taskId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external override onlyExecutor nonReentrant {
        Task storage task = _tasks[taskId];
        if (task.id == 0) revert TaskNotFound();
        if (recipients.length != amounts.length) revert LengthMismatch();

        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        if (total != task.bounty) revert DistributionMismatch();

        for (uint256 i = 0; i < recipients.length; i++) {
            (bool ok, ) = payable(recipients[i]).call{value: amounts[i]}("");
            require(ok, "BOUNTY_TRANSFER_FAILED");
        }

        emit BountyReleased(taskId, total, recipients.length);
    }

    function getTask(uint256 taskId)
        external
        view
        override
        returns (
            uint256 id,
            address creator,
            string memory prompt,
            uint256 bounty,
            uint8 minAgents,
            uint8 maxAgents,
            uint8 minSubmissions,
            uint64 deadline,
            HivemindTypes.TaskStatus status,
            address[] memory claimedAgents,
            uint256 synthesisId
        )
    {
        Task storage task = _tasks[taskId];
        if (task.id == 0) revert TaskNotFound();

        return (
            task.id,
            task.creator,
            task.prompt,
            task.bounty,
            task.minAgents,
            task.maxAgents,
            task.minSubmissions,
            task.deadline,
            task.status,
            task.claimedAgents,
            task.synthesisId
        );
    }

    function getAgent(address wallet)
        external
        view
        override
        returns (
            address agentWallet,
            string memory name,
            string[] memory capabilities,
            uint256 reputation,
            uint256 tasksCompleted,
            uint256 totalEarned,
            bool active
        )
    {
        Agent storage agent = _agents[wallet];
        (uint256 rep, uint256 completed, uint256 earned) = IAgentReputation(reputationContract).getAgentTotals(wallet);
        return (
            agent.wallet,
            agent.name,
            agent.capabilities,
            rep,
            completed,
            earned,
            agent.active
        );
    }

    function getOpenTasks() external view returns (uint256[] memory openTaskIds) {
        uint256 openCount;
        for (uint256 i = 0; i < _taskIds.length; i++) {
            if (_tasks[_taskIds[i]].status == HivemindTypes.TaskStatus.Open) {
                openCount++;
            }
        }

        openTaskIds = new uint256[](openCount);
        uint256 cursor;
        for (uint256 i = 0; i < _taskIds.length; i++) {
            uint256 taskId = _taskIds[i];
            if (_tasks[taskId].status == HivemindTypes.TaskStatus.Open) {
                openTaskIds[cursor++] = taskId;
            }
        }
    }

    function taskCount() external view returns (uint256) {
        return _taskCount;
    }

    function _isClaimed(address[] storage claimedAgents, address agent) private view returns (bool) {
        for (uint256 i = 0; i < claimedAgents.length; i++) {
            if (claimedAgents[i] == agent) {
                return true;
            }
        }
        return false;
    }
}
