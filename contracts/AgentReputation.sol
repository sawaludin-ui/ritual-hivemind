// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IAgentReputation.sol";
import "./utils/Owned.sol";

contract AgentReputation is Owned, IAgentReputation {
    event ReputationUpdated(address indexed agent, int256 delta, uint256 newReputation);
    event BountyDistributed(uint256 indexed taskId, uint256 totalBounty, uint256 recipients);
    event RewardRecorded(address indexed agent, uint256 payout, uint256 cumulativeEarned);

    error NotAuthorizedCaller();
    error LengthMismatch();
    error ZeroWeights();

    mapping(address => uint256) private _reputation;
    mapping(address => uint256) private _tasksCompleted;
    mapping(address => uint256) private _totalEarned;
    mapping(address => bool) private _seen;
    address[] private _knownAgents;
    mapping(address => bool) public authorizedCallers;

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender]) revert NotAuthorizedCaller();
        _;
    }

    function setAuthorizedCaller(address caller, bool allowed) external onlyOwner {
        authorizedCallers[caller] = allowed;
    }

    function updateReputation(address agent, int256 delta) external override onlyAuthorized {
        _registerAgent(agent);

        uint256 current = _reputation[agent];
        uint256 next;
        if (delta < 0) {
            uint256 decrease = uint256(-delta);
            next = decrease >= current ? 0 : current - decrease;
        } else {
            next = current + uint256(delta);
        }

        _reputation[agent] = next;
        emit ReputationUpdated(agent, delta, next);
    }

    function distributeBounty(
        uint256 taskId,
        address[] calldata contributors,
        uint256[] calldata weights,
        uint256 totalBounty
    ) external override onlyAuthorized returns (uint256[] memory payouts) {
        if (contributors.length != weights.length) revert LengthMismatch();
        if (contributors.length == 0) revert ZeroWeights();

        uint256 totalWeight;
        for (uint256 i = 0; i < weights.length; i++) {
            totalWeight += weights[i];
        }
        if (totalWeight == 0) revert ZeroWeights();

        payouts = new uint256[](contributors.length);
        uint256 allocated;
        for (uint256 i = 0; i < contributors.length; i++) {
            uint256 payout = (totalBounty * weights[i]) / totalWeight;
            if (i == contributors.length - 1) {
                payout = totalBounty - allocated;
            }
            payouts[i] = payout;
            allocated += payout;

            _registerAgent(contributors[i]);
            _totalEarned[contributors[i]] += payout;
            _tasksCompleted[contributors[i]] += 1;
            emit RewardRecorded(contributors[i], payout, _totalEarned[contributors[i]]);
        }

        emit BountyDistributed(taskId, totalBounty, contributors.length);
    }

    function recordReward(address agent, uint256 payout) external override onlyAuthorized {
        _registerAgent(agent);
        _totalEarned[agent] += payout;
        emit RewardRecorded(agent, payout, _totalEarned[agent]);
    }

    function getLeaderboard(uint256 limit)
        external
        view
        override
        returns (address[] memory agents, uint256[] memory reputations)
    {
        uint256 size = _knownAgents.length;
        if (limit < size) {
            size = limit;
        }

        agents = new address[](size);
        reputations = new uint256[](size);

        for (uint256 i = 0; i < size; i++) {
            address candidate = address(0);
            uint256 candidateRep = 0;
            uint256 candidateIndex = type(uint256).max;

            for (uint256 j = 0; j < _knownAgents.length; j++) {
                address current = _knownAgents[j];
                bool used = false;
                for (uint256 k = 0; k < i; k++) {
                    if (agents[k] == current) {
                        used = true;
                        break;
                    }
                }
                if (used) continue;

                uint256 currentRep = _reputation[current];
                if (candidate == address(0) || currentRep > candidateRep || (currentRep == candidateRep && j < candidateIndex)) {
                    candidate = current;
                    candidateRep = currentRep;
                    candidateIndex = j;
                }
            }

            agents[i] = candidate;
            reputations[i] = candidateRep;
        }
    }

    function getReputation(address agent) external view override returns (uint256) {
        return _reputation[agent];
    }

    function getAgentTotals(address agent)
        external
        view
        returns (uint256 reputation, uint256 tasksCompleted, uint256 totalEarned)
    {
        return (_reputation[agent], _tasksCompleted[agent], _totalEarned[agent]);
    }

    function knownAgents() external view returns (address[] memory) {
        return _knownAgents;
    }

    function _registerAgent(address agent) private {
        if (_seen[agent]) return;
        _seen[agent] = true;
        _knownAgents.push(agent);
        if (_reputation[agent] == 0) {
            _reputation[agent] = 100;
        }
    }
}

