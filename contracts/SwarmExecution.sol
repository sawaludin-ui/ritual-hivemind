// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Types.sol";
import "./interfaces/IAgentReputation.sol";
import "./interfaces/IHivemindCore.sol";
import "./interfaces/ITeeVerifier.sol";
import "./utils/Owned.sol";
import "./utils/ReentrancyGuardLite.sol";

contract SwarmExecution is Owned, ReentrancyGuardLite {
    struct Submission {
        uint256 id;
        uint256 taskId;
        address agent;
        string answer;
        bytes teeAttestation;
        uint64 timestamp;
        bool verified;
    }

    struct Synthesis {
        uint256 taskId;
        address synthesizer;
        string consensusReport;
        uint8 consensusScore;
        address[] contributors;
        string[] dissents;
    }

    event AnswerSubmitted(uint256 indexed submissionId, uint256 indexed taskId, address indexed agent);
    event SubmissionVerified(uint256 indexed submissionId, bool verified);
    event SynthesisComplete(uint256 indexed taskId, address indexed synthesizer, uint8 consensusScore);

    error TaskNotFound();
    error TaskClosed();
    error AgentNotRegistered();
    error AgentNotClaimed();
    error AlreadySubmitted();
    error NotEnoughVerifiedSubmissions();
    error SubmissionNotFound();

    IHivemindCore public immutable core;
    IAgentReputation public immutable reputation;
    ITeeVerifier public immutable teeVerifier;

    uint256 public nextSubmissionId = 1;
    mapping(uint256 => Submission) private _submissions;
    mapping(uint256 => uint256[]) private _submissionIdsByTask;
    mapping(uint256 => Synthesis) private _syntheses;

    constructor(address core_, address reputation_, address teeVerifier_) {
        if (core_ == address(0) || reputation_ == address(0)) revert ZeroAddress();
        core = IHivemindCore(core_);
        reputation = IAgentReputation(reputation_);
        teeVerifier = ITeeVerifier(teeVerifier_);
    }

    function submitAnswer(
        uint256 taskId,
        string calldata answer,
        bytes calldata teeAttestation
    ) external returns (uint256 submissionId) {
        (
            uint256 _taskId,
            ,
            ,
            ,
            ,
            ,
            uint64 deadline,
            HivemindTypes.TaskStatus status,
            address[] memory claimedAgents,

        ) = core.getTask(taskId);

        (
            address agentWallet,
            ,
            ,
            ,
            ,
            ,
            bool active
        ) = core.getAgent(msg.sender);

        if (_taskId == 0) revert TaskNotFound();
        if (!active || agentWallet != msg.sender) revert AgentNotRegistered();
        if (deadline <= block.timestamp) revert TaskClosed();
        if (status == HivemindTypes.TaskStatus.Complete || status == HivemindTypes.TaskStatus.Failed) revert TaskClosed();
        if (!_isClaimed(claimedAgents, msg.sender)) revert AgentNotClaimed();
        if (_hasSubmitted(taskId, msg.sender)) revert AlreadySubmitted();

        submissionId = nextSubmissionId++;
        _submissions[submissionId] = Submission({
            id: submissionId,
            taskId: taskId,
            agent: msg.sender,
            answer: answer,
            teeAttestation: teeAttestation,
            timestamp: uint64(block.timestamp),
            verified: false
        });
        _submissionIdsByTask[taskId].push(submissionId);

        if (status == HivemindTypes.TaskStatus.Open) {
            core.markTaskStatus(taskId, HivemindTypes.TaskStatus.Executing);
        }

        emit AnswerSubmitted(submissionId, taskId, msg.sender);
    }

    function verifySubmission(uint256 submissionId) public returns (bool verified) {
        Submission storage submission = _submissions[submissionId];
        if (submission.id == 0) revert SubmissionNotFound();

        if (address(teeVerifier) != address(0)) {
            verified = teeVerifier.verify(
                submission.teeAttestation,
                submission.taskId,
                submission.agent,
                submission.answer
            );
        } else {
            verified = submission.teeAttestation.length > 0;
        }

        submission.verified = verified;
        emit SubmissionVerified(submissionId, verified);
    }

    function synthesize(uint256 taskId) external nonReentrant {
        (
            uint256 _taskId,
            ,
            string memory prompt,
            uint256 bounty,
            uint8 minAgents,
            uint8 maxAgents,
            ,
            HivemindTypes.TaskStatus status,
            address[] memory claimedAgents,

        ) = core.getTask(taskId);

        if (_taskId == 0) revert TaskNotFound();
        if (status == HivemindTypes.TaskStatus.Complete || status == HivemindTypes.TaskStatus.Failed) revert TaskClosed();

        uint256[] memory submissionIds = _submissionIdsByTask[taskId];
        uint256 verifiedCount;
        for (uint256 i = 0; i < submissionIds.length; i++) {
            if (verifySubmission(submissionIds[i])) {
                verifiedCount++;
            }
        }
        if (verifiedCount < minAgents || verifiedCount > maxAgents) {
            revert NotEnoughVerifiedSubmissions();
        }

        address[] memory contributors = new address[](verifiedCount);
        uint256[] memory weights = new uint256[](verifiedCount);
        string[] memory dissent = new string[](submissionIds.length - verifiedCount);

        uint256 contributorCursor;
        uint256 dissentCursor;
        for (uint256 i = 0; i < submissionIds.length; i++) {
            Submission storage submission = _submissions[submissionIds[i]];
            if (submission.verified) {
                contributors[contributorCursor] = submission.agent;
                weights[contributorCursor] = 1;
                contributorCursor++;
                reputation.updateReputation(submission.agent, 10);
            } else {
                dissent[dissentCursor++] = submission.answer;
                reputation.updateReputation(submission.agent, -2);
            }
        }

        for (uint256 i = 0; i < claimedAgents.length; i++) {
            if (!_hasSubmitted(taskId, claimedAgents[i])) {
                reputation.updateReputation(claimedAgents[i], -1);
            }
        }

        string memory consensusReport = _composeConsensusReport(prompt, submissionIds);
        if (block.chainid == 1979) {
            consensusReport = _callLLM(consensusReport);
        }

        uint256[] memory payouts = reputation.distributeBounty(taskId, contributors, weights, bounty);
        core.markTaskStatus(taskId, HivemindTypes.TaskStatus.Synthesizing);
        core.releaseBounty(taskId, contributors, payouts);
        core.markTaskStatus(taskId, HivemindTypes.TaskStatus.Complete);

        _syntheses[taskId] = Synthesis({
            taskId: taskId,
            synthesizer: msg.sender,
            consensusReport: consensusReport,
            consensusScore: uint8(verifiedCount == 0 ? 0 : 100),
            contributors: contributors,
            dissents: dissent
        });

        emit SynthesisComplete(taskId, msg.sender, uint8(verifiedCount == 0 ? 0 : 100));
    }

    function getSubmissions(uint256 taskId) external view returns (Submission[] memory submissions) {
        uint256[] memory submissionIds = _submissionIdsByTask[taskId];
        submissions = new Submission[](submissionIds.length);
        for (uint256 i = 0; i < submissionIds.length; i++) {
            submissions[i] = _submissions[submissionIds[i]];
        }
    }

    function getSynthesis(uint256 taskId) external view returns (Synthesis memory) {
        return _syntheses[taskId];
    }

    function _composeConsensusReport(string memory prompt, uint256[] memory submissionIds)
        internal
        view
        returns (string memory)
    {
        bytes memory output = abi.encodePacked("Consensus for: ", prompt, "\n");
        for (uint256 i = 0; i < submissionIds.length; i++) {
            Submission storage submission = _submissions[submissionIds[i]];
            output = abi.encodePacked(output, "- ", _addressToString(submission.agent), ": ", submission.answer, "\n");
        }
        return string(output);
    }

    function _callLLM(string memory prompt) internal returns (string memory) {
        (bool ok, bytes memory result) = address(0x0802).call(abi.encode(prompt));
        if (!ok || result.length == 0) {
            return prompt;
        }
        return abi.decode(result, (string));
    }

    function _isClaimed(address[] memory claimedAgents, address agent) internal pure returns (bool) {
        for (uint256 i = 0; i < claimedAgents.length; i++) {
            if (claimedAgents[i] == agent) {
                return true;
            }
        }
        return false;
    }

    function _hasSubmitted(uint256 taskId, address agent) internal view returns (bool) {
        uint256[] memory submissionIds = _submissionIdsByTask[taskId];
        for (uint256 i = 0; i < submissionIds.length; i++) {
            if (_submissions[submissionIds[i]].agent == agent) {
                return true;
            }
        }
        return false;
    }

    function _addressToString(address account) internal pure returns (string memory) {
        bytes20 value = bytes20(account);
        bytes16 alphabet = "0123456789abcdef";

        bytes memory buffer = new bytes(42);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            buffer[2 + i * 2] = alphabet[uint8(value[i] >> 4)];
            buffer[3 + i * 2] = alphabet[uint8(value[i] & 0x0f)];
        }
        return string(buffer);
    }
}
