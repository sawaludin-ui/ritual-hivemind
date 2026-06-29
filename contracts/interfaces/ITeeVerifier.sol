// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITeeVerifier {
    function verify(
        bytes calldata attestation,
        uint256 taskId,
        address agent,
        string calldata answer
    ) external view returns (bool);
}

