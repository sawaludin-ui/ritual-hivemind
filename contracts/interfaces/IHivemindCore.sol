// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../Types.sol";

interface IHivemindCore {
    function registerAgent(string calldata name, string[] calldata capabilities) external;

    function createTask(
        string calldata prompt,
        uint8 minAgents,
        uint8 maxAgents,
        uint8 minSubmissions,
        uint64 deadline
    ) external payable returns (uint256 taskId);

    function claimTask(uint256 taskId) external;

    function markTaskStatus(uint256 taskId, HivemindTypes.TaskStatus status) external;

    function releaseBounty(
        uint256 taskId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external;

    function getTask(uint256 taskId)
        external
        view
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
        );

    function getAgent(address wallet)
        external
        view
        returns (
            address agentWallet,
            string memory name,
            string[] memory capabilities,
            uint256 reputation,
            uint256 tasksCompleted,
            uint256 totalEarned,
            bool active
        );
}

