// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentReputation {
    function updateReputation(address agent, int256 delta) external;

    function distributeBounty(
        uint256 taskId,
        address[] calldata contributors,
        uint256[] calldata weights,
        uint256 totalBounty
    ) external returns (uint256[] memory payouts);

    function recordReward(address agent, uint256 payout) external;

    function getLeaderboard(uint256 limit)
        external
        view
        returns (address[] memory agents, uint256[] memory reputations);

    function getReputation(address agent) external view returns (uint256);

    function getAgentTotals(address agent)
        external
        view
        returns (uint256 reputation, uint256 tasksCompleted, uint256 totalEarned);
}

