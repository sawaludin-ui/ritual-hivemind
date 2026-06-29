// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PrecompileConsumer
 * @notice Abstract base contract for securely calling Ritual Chain precompiles.
 *
 * Ritual's TEE-EOVMT architecture delegates resource-intensive operations
 * (LLM inference, HTTP requests, TEE attestation) to off-chain executors
 * running inside Trusted Execution Environments. From the contract's
 * perspective, these look like regular precompile calls at well-known
 * addresses — but the encoding/decoding differs from EVM-native precompiles.
 *
 * PRE-COMPILE MAP (relevant to Hivemind):
 *
 *   Address | Type        | Purpose
 *   --------|-------------|----------------------------------------------
 *   0x0802  | LLM         | LLM inference (short-running async / single-phase)
 *   0x0801  | HTTP        | HTTP requests (short-running async / single-phase)
 *   0x0009  | Ed25519     | Ed25519 signature verification (sync)
 *
 * SHORT-RUNNING ASYNC PATTERN (used by LLM and HTTP):
 *   - The block builder detects the precompile call and farms it to a TEE
 *     executor, then replays the transaction with the signed result.
 *   - The raw output encodes TWO things: (simmedInput, actualOutput). We
 *     strip the simmedInput wrapper and return actualOutput to callers.
 *
 * CONSTRAINT:
 *   Only ONE async precompile call per transaction. You cannot combine
 *   LLM + HTTP (or any two async precompiles) in the same tx.
 *   If both are needed, they must be split across separate transactions
 *   or use the Scheduler contract for long-running two-phase ops.
 *
 * References:
 *   - https://docs.ritualfoundation.org/precompiles
 *   - Ritual Symphony paper (TEE-EOVMT architecture)
 */
abstract contract PrecompileConsumer {
    // ------------------------------------------------------------------ //
    //                         Precompile Addresses                       //
    // ------------------------------------------------------------------ //

    // Synchronous
    address internal constant ONNX_PRECOMPILE = address(0x0800);
    address internal constant JQ_PRECOMPILE = address(0x0803);
    address internal constant ED25519_PRECOMPILE = address(0x0009);
    address internal constant SECP256R1_PRECOMPILE = address(0x0100);
    address internal constant TX_HASH_PRECOMPILE = address(0x0830);

    // Short-running async (single-phase — same transaction)
    address internal constant HTTP_CALL_PRECOMPILE = address(0x0801);
    address internal constant LLM_INFERENCE_PRECOMPILE = address(0x0802);

    // System contracts
    address internal constant RITUAL_WALLET =
        0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948;

    // ------------------------------------------------------------------ //
    //                          Decoded Types                             //
    // ------------------------------------------------------------------ //

    /// @notice Decoded shape of the LLM convo-history tail in the response.
    struct ConvoHistory {
        string storageType;
        string path;
        string secretsName;
    }

    // ------------------------------------------------------------------ //
    //                         Core Executor                              //
    // ------------------------------------------------------------------ //

    /**
     * @notice Safely calls any Ritual precompile, unwrapping the
     *         short-running async envelope (simmedInput, actualOutput)
     *         for LLM and HTTP precompiles.
     *
     * @param precompile  The precompile address (e.g. 0x0802 for LLM)
     * @param input       ABI-encoded input matching the precompile's spec
     * @return output     Decoded output bytes (actual output, not simmed)
     */
    function _executePrecompile(
        address precompile,
        bytes memory input
    ) internal returns (bytes memory) {
        (bool success, bytes memory rawOutput) = precompile.call(input);

        if (!success) {
            assembly {
                revert(add(rawOutput, 32), mload(rawOutput))
            }
        }

        // Short-running async precompiles wrap their result as
        // abi.encode(bytes simmedInput, bytes actualOutput).
        // Strip the simmedInput envelope and return only actualOutput.
        if (
            precompile == HTTP_CALL_PRECOMPILE ||
            precompile == LLM_INFERENCE_PRECOMPILE
        ) {
            (, bytes memory actualOutput) = abi.decode(
                rawOutput,
                (bytes, bytes)
            );
            return actualOutput;
        }

        return rawOutput;
    }

    // ------------------------------------------------------------------ //
    //                         LLM Precompile Helpers                     //
    // ------------------------------------------------------------------ //

    /**
     * @notice Calls the LLM precompile (0x0802) with a pre-encoded payload
     *         and decodes the result into a completion string.
     *
     * @param llmPayload  Fully encoded LLM request payload (constructed
     *                    off-chain or assembled from on-chain data).
     *                    Must match the Ritual LLM precompile's input ABI:
     *                      (string model, bool stream, LlmMessages[] messages,
     *                       uint256 maxTokens, uint256 temperature, ...)
     * @return completion  The decoded text completion. Empty if error.
     *
     * REVERT CONDITIONS:
     *   - Precompile call itself fails (low-level .call failure)
     *   - Precompile reports hasError == true (LLM inference error)
     */
    function _callLLM(
        bytes memory llmPayload
    ) internal returns (string memory completion) {
        bytes memory output = _executePrecompile(
            LLM_INFERENCE_PRECOMPILE,
            llmPayload
        );

        (
            bool hasError,
            bytes memory completionData,
            ,
            string memory errorMessage,

        ) = abi.decode(output, (bool, bytes, bytes, string, ConvoHistory));

        if (hasError) {
            revert(string(abi.encodePacked("LLM_PRECOMPILE_ERROR: ", errorMessage)));
        }

        return string(completionData);
    }

    // ------------------------------------------------------------------ //
    //                        HTTP Precompile Helpers                     //
    // ------------------------------------------------------------------ //

    /**
     * @notice Calls the HTTP precompile (0x0801) to fetch external data.
     *
     * @param httpPayload  Fully encoded HTTP request payload (constructed
     *                     off-chain or assembled on-chain). Must match the
     *                     Ritual HTTP precompile's input ABI:
     *                       (string url, string method, HttpHeaders[] headers,
     *                        bytes body, ...)
     * @return response    The decoded HTTP response body as bytes.
     *
     * REVERT CONDITIONS:
     *   - Precompile call itself fails
     *   - Precompile reports hasError == true (HTTP error)
     *
     * CONSTRAINT: Cannot be combined with LLM precompile in the same
     * transaction (one async precompile per tx rule).
     */
    function _callHTTP(
        bytes memory httpPayload
    ) internal returns (bytes memory response) {
        bytes memory output = _executePrecompile(
            HTTP_CALL_PRECOMPILE,
            httpPayload
        );

        (
            bool hasError,
            bytes memory responseData,
            string memory errorMessage
        ) = abi.decode(output, (bool, bytes, string));

        if (hasError) {
            revert(string(abi.encodePacked("HTTP_PRECOMPILE_ERROR: ", errorMessage)));
        }

        return responseData;
    }
}
