// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/ITeeVerifier.sol";

contract MockTeeVerifier is ITeeVerifier {
    function verify(
        bytes calldata attestation,
        uint256,
        address,
        string calldata
    ) external pure override returns (bool) {
        return attestation.length > 0;
    }
}

