// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./utils/Owned.sol";
import "./utils/ReentrancyGuardLite.sol";

/**
 * @title PredictionMarket
 * @notice Binary parimutuel prediction market for Ritual Predix.
 *
 * Model: PARIMUTUEL POOL (not AMM).
 *   - Users stake RITUAL on outcome A or B.
 *   - Each stake mints "shares" 1:1 with net stake (after fee).
 *   - On resolution, the entire losing pool is distributed to winners
 *     pro-rata to their shares in the winning side.
 *   - Winners get: original stake-equivalent + proportional share of losing pool.
 *
 * Early exit (sellPosition): user sells shares back at the CURRENT implied price.
 *   - Implied price of a side = sideStaked / totalStaked.
 *   - Payout = shares * impliedPrice, minus exit fee.
 *   - This reduces that side's pool and burns the shares.
 *
 * Fees:
 *   - Bet fee: BET_FEE_BPS (default 2%) taken at stake time → feeCollector.
 *   - Exit fee: EXIT_FEE_BPS (default 1%) taken at sell time → feeCollector.
 *
 * Resolution: trusted resolver (owner or designated oracle) sets outcome.
 *
 * NOTE: Ritual chain uses MILLISECOND timestamps. `deadline` is supplied and
 *       compared in the same unit the chain returns from block.timestamp.
 *       This contract does NOT compare deadline to block.timestamp on-chain
 *       for betting cutoff EXCEPT via an explicit closeMarket call, to avoid
 *       unit-mismatch bugs. Betting is open until the market is closed/resolved.
 */
contract PredictionMarket is Owned, ReentrancyGuardLite {
    // ---------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------

    enum Status {
        Active, // 0 - accepting bets and trades
        Closed, // 1 - betting closed, awaiting resolution
        Resolved, // 2 - outcome set, winners can claim
        Cancelled // 3 - voided, everyone can refund net stake
    }

    enum Outcome {
        Unresolved, // 0
        OptionA, // 1 - A wins
        OptionB // 2 - B wins
    }

    struct Market {
        uint256 id;
        string question; // "Brazil vs Germany — Who wins?"
        string optionA; // "Brazil"
        string optionB; // "Germany"
        uint64 deadline; // kick-off time (chain-native unit, informational)
        uint256 stakedA; // total net RITUAL staked on A
        uint256 stakedB; // total net RITUAL staked on B
        uint256 sharesA; // total shares minted on A
        uint256 sharesB; // total shares minted on B
        Status status;
        Outcome outcome;
        address creator;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    struct Position {
        uint256 sharesA;
        uint256 sharesB;
        uint256 invested; // gross RITUAL the user put in (incl. fees they paid)
        bool claimed; // claimed winnings / refund
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public betFeeBps = 200; // 2%
    uint256 public exitFeeBps = 100; // 1%
    uint256 public constant MAX_FEE_BPS = 1_000; // 10% hard cap, safety

    address public feeCollector;
    uint256 public accumulatedFees; // lifetime fees collected (informational)

    mapping(uint256 => Market) private _markets;
    mapping(uint256 => mapping(address => Position)) private _positions;
    mapping(uint256 => address[]) private _bettors; // for enumeration / UI
    mapping(uint256 => mapping(address => bool)) private _hasBet;

    mapping(address => bool) public resolvers; // addresses allowed to resolve

    uint256 private _marketCount;
    uint256[] private _marketIds;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string question,
        string optionA,
        string optionB,
        uint64 deadline
    );
    event BetPlaced(
        uint256 indexed marketId,
        address indexed bettor,
        Outcome side,
        uint256 grossAmount,
        uint256 netAmount,
        uint256 sharesMinted,
        uint256 fee
    );
    event PositionSold(
        uint256 indexed marketId,
        address indexed bettor,
        Outcome side,
        uint256 sharesSold,
        uint256 payout,
        uint256 fee
    );
    event MarketClosed(uint256 indexed marketId);
    event MarketResolved(uint256 indexed marketId, Outcome outcome);
    event MarketCancelled(uint256 indexed marketId);
    event WinningsClaimed(uint256 indexed marketId, address indexed bettor, uint256 amount);
    event RefundClaimed(uint256 indexed marketId, address indexed bettor, uint256 amount);
    event FeeCollectorUpdated(address indexed previous, address indexed current);
    event ResolverUpdated(address indexed resolver, bool allowed);
    event FeesUpdated(uint256 betFeeBps, uint256 exitFeeBps);

    // ---------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------

    error EmptyQuestion();
    error EmptyOption();
    error MarketNotFound();
    error MarketNotActive();
    error MarketNotResolved();
    error MarketNotCancelled();
    error InvalidSide();
    error ZeroStake();
    error ZeroShares();
    error InsufficientShares();
    error AlreadyClaimed();
    error NothingToClaim();
    error NotResolver();
    error InvalidOutcome();
    error FeeTooHigh();
    error TransferFailed();
    error NoCounterparty();

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(address feeCollector_) {
        if (feeCollector_ == address(0)) revert ZeroAddress();
        feeCollector = feeCollector_;
        resolvers[msg.sender] = true;
        emit FeeCollectorUpdated(address(0), feeCollector_);
        emit ResolverUpdated(msg.sender, true);
    }

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyResolver() {
        if (!resolvers[msg.sender]) revert NotResolver();
        _;
    }

    modifier marketExists(uint256 marketId) {
        if (_markets[marketId].id == 0) revert MarketNotFound();
        _;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setFeeCollector(address newCollector) external onlyOwner {
        if (newCollector == address(0)) revert ZeroAddress();
        emit FeeCollectorUpdated(feeCollector, newCollector);
        feeCollector = newCollector;
    }

    function setResolver(address resolver, bool allowed) external onlyOwner {
        if (resolver == address(0)) revert ZeroAddress();
        resolvers[resolver] = allowed;
        emit ResolverUpdated(resolver, allowed);
    }

    function setFees(uint256 newBetFeeBps, uint256 newExitFeeBps) external onlyOwner {
        if (newBetFeeBps > MAX_FEE_BPS || newExitFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        betFeeBps = newBetFeeBps;
        exitFeeBps = newExitFeeBps;
        emit FeesUpdated(newBetFeeBps, newExitFeeBps);
    }

    // ---------------------------------------------------------------------
    // Market creation
    // ---------------------------------------------------------------------

    function createMarket(
        string calldata question,
        string calldata optionA,
        string calldata optionB,
        uint64 deadline
    ) external onlyResolver returns (uint256 marketId) {
        if (bytes(question).length == 0) revert EmptyQuestion();
        if (bytes(optionA).length == 0 || bytes(optionB).length == 0) revert EmptyOption();

        marketId = ++_marketCount;
        Market storage m = _markets[marketId];
        m.id = marketId;
        m.question = question;
        m.optionA = optionA;
        m.optionB = optionB;
        m.deadline = deadline;
        m.status = Status.Active;
        m.outcome = Outcome.Unresolved;
        m.creator = msg.sender;
        m.createdAt = block.timestamp;

        _marketIds.push(marketId);

        emit MarketCreated(marketId, msg.sender, question, optionA, optionB, deadline);
    }

    // ---------------------------------------------------------------------
    // Betting
    // ---------------------------------------------------------------------

    function bet(uint256 marketId, Outcome side) external payable nonReentrant marketExists(marketId) {
        if (side != Outcome.OptionA && side != Outcome.OptionB) revert InvalidSide();
        if (msg.value == 0) revert ZeroStake();

        Market storage m = _markets[marketId];
        if (m.status != Status.Active) revert MarketNotActive();

        // Fee
        uint256 fee = (msg.value * betFeeBps) / BPS_DENOMINATOR;
        uint256 net = msg.value - fee;
        if (net == 0) revert ZeroStake();

        // Shares are minted 1:1 with net stake in a parimutuel model.
        // (Price discovery comes from pool ratios, not share price.)
        uint256 sharesMinted = net;

        Position storage p = _positions[marketId][msg.sender];
        if (!_hasBet[marketId][msg.sender]) {
            _hasBet[marketId][msg.sender] = true;
            _bettors[marketId].push(msg.sender);
        }

        if (side == Outcome.OptionA) {
            m.stakedA += net;
            m.sharesA += sharesMinted;
            p.sharesA += sharesMinted;
        } else {
            m.stakedB += net;
            m.sharesB += sharesMinted;
            p.sharesB += sharesMinted;
        }
        p.invested += msg.value;

        // Collect fee
        if (fee > 0) {
            accumulatedFees += fee;
            _safeTransfer(feeCollector, fee);
        }

        emit BetPlaced(marketId, msg.sender, side, msg.value, net, sharesMinted, fee);
    }

    // ---------------------------------------------------------------------
    // Early exit (continuous trading)
    // ---------------------------------------------------------------------

    /**
     * @notice Exit a position early before resolution.
     * @dev SOLVENCY-SAFE design: a seller withdraws their OWN net stake on that
     *      side (shares are 1:1 with net stake), minus an exit fee. We burn the
     *      shares and reduce the side's pool by exactly the same amount.
     *
     *      Why not implied-price speculation? In a parimutuel pool, paying a
     *      seller more than their stake would drain the prize pool other
     *      bettors are counting on, creating insolvency. Early exit here is a
     *      "cash out my stake" feature (cut losses / free capital), NOT a
     *      profit-on-exit trade. Profit only comes from winning the market.
     *
     *      This keeps the invariant: sum(stakedA + stakedB) == claimable pool,
     *      always backed by contract balance.
     */
    function sellPosition(
        uint256 marketId,
        Outcome side,
        uint256 sharesToSell
    ) external nonReentrant marketExists(marketId) {
        if (side != Outcome.OptionA && side != Outcome.OptionB) revert InvalidSide();
        if (sharesToSell == 0) revert ZeroShares();

        Market storage m = _markets[marketId];
        if (m.status != Status.Active) revert MarketNotActive();

        Position storage p = _positions[marketId][msg.sender];

        // Withdraw the seller's own net stake represented by these shares (1:1).
        uint256 payoutGross = sharesToSell;

        if (side == Outcome.OptionA) {
            if (p.sharesA < sharesToSell) revert InsufficientShares();
            p.sharesA -= sharesToSell;
            m.sharesA -= sharesToSell;
            m.stakedA -= sharesToSell;
        } else {
            if (p.sharesB < sharesToSell) revert InsufficientShares();
            p.sharesB -= sharesToSell;
            m.sharesB -= sharesToSell;
            m.stakedB -= sharesToSell;
        }

        uint256 fee = (payoutGross * exitFeeBps) / BPS_DENOMINATOR;
        uint256 payoutNet = payoutGross - fee;

        // Guard: contract must hold enough to pay
        if (address(this).balance < payoutNet + fee) revert NoCounterparty();

        if (fee > 0) {
            accumulatedFees += fee;
            _safeTransfer(feeCollector, fee);
        }
        _safeTransfer(msg.sender, payoutNet);

        emit PositionSold(marketId, msg.sender, side, sharesToSell, payoutNet, fee);
    }

    // ---------------------------------------------------------------------
    // Resolution
    // ---------------------------------------------------------------------

    function closeMarket(uint256 marketId) external onlyResolver marketExists(marketId) {
        Market storage m = _markets[marketId];
        if (m.status != Status.Active) revert MarketNotActive();
        m.status = Status.Closed;
        emit MarketClosed(marketId);
    }

    function resolveMarket(uint256 marketId, Outcome outcome) external onlyResolver marketExists(marketId) {
        if (outcome != Outcome.OptionA && outcome != Outcome.OptionB) revert InvalidOutcome();
        Market storage m = _markets[marketId];
        if (m.status != Status.Active && m.status != Status.Closed) revert MarketNotActive();

        m.status = Status.Resolved;
        m.outcome = outcome;
        m.resolvedAt = block.timestamp;

        emit MarketResolved(marketId, outcome);
    }

    function cancelMarket(uint256 marketId) external onlyResolver marketExists(marketId) {
        Market storage m = _markets[marketId];
        if (m.status == Status.Resolved) revert MarketNotActive();
        m.status = Status.Cancelled;
        emit MarketCancelled(marketId);
    }

    // ---------------------------------------------------------------------
    // Claim
    // ---------------------------------------------------------------------

    /**
     * @notice Claim winnings after resolution.
     * @dev Winner payout = winning shares + pro-rata slice of losing pool.
     *      winnerShare = mySharesOnWinningSide / totalSharesOnWinningSide
     *      payout = myStakeEquivalent + winnerShare * losingPool
     *
     *      Because shares are 1:1 with net stake, mySharesOnWinningSide is
     *      exactly the net RITUAL I staked on the winning side. So:
     *      payout = myWinningShares + (myWinningShares / totalWinningShares) * losingPool
     */
    function claimWinnings(uint256 marketId) external nonReentrant marketExists(marketId) {
        Market storage m = _markets[marketId];
        if (m.status != Status.Resolved) revert MarketNotResolved();

        Position storage p = _positions[marketId][msg.sender];
        if (p.claimed) revert AlreadyClaimed();

        uint256 winningShares;
        uint256 totalWinningShares;
        uint256 losingPool;

        if (m.outcome == Outcome.OptionA) {
            winningShares = p.sharesA;
            totalWinningShares = m.sharesA;
            losingPool = m.stakedB;
        } else {
            winningShares = p.sharesB;
            totalWinningShares = m.sharesB;
            losingPool = m.stakedA;
        }

        if (winningShares == 0) revert NothingToClaim();

        p.claimed = true;

        // Base: get back winning-side stake equivalent (shares are 1:1 with stake)
        uint256 payout = winningShares;
        // Plus pro-rata slice of losing pool
        if (totalWinningShares > 0 && losingPool > 0) {
            payout += (winningShares * losingPool) / totalWinningShares;
        }

        if (payout == 0) revert NothingToClaim();
        _safeTransfer(msg.sender, payout);

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    /**
     * @notice Refund net stake if market is cancelled.
     */
    function claimRefund(uint256 marketId) external nonReentrant marketExists(marketId) {
        Market storage m = _markets[marketId];
        if (m.status != Status.Cancelled) revert MarketNotCancelled();

        Position storage p = _positions[marketId][msg.sender];
        if (p.claimed) revert AlreadyClaimed();

        uint256 refund = p.sharesA + p.sharesB; // net staked (1:1 shares)
        if (refund == 0) revert NothingToClaim();

        p.claimed = true;
        _safeTransfer(msg.sender, refund);

        emit RefundClaimed(marketId, msg.sender, refund);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getMarket(uint256 marketId) external view marketExists(marketId) returns (Market memory) {
        return _markets[marketId];
    }

    function getPosition(uint256 marketId, address user) external view returns (Position memory) {
        return _positions[marketId][user];
    }

    /**
     * @notice Implied probability (in basis points) of each side.
     * @return probA basis points (0-10000) for option A
     * @return probB basis points (0-10000) for option B
     */
    function getOdds(uint256 marketId) external view marketExists(marketId) returns (uint256 probA, uint256 probB) {
        Market storage m = _markets[marketId];
        uint256 total = m.stakedA + m.stakedB;
        if (total == 0) {
            return (5_000, 5_000); // 50/50 when no liquidity
        }
        probA = (m.stakedA * BPS_DENOMINATOR) / total;
        probB = BPS_DENOMINATOR - probA;
    }

    function getBettors(uint256 marketId) external view returns (address[] memory) {
        return _bettors[marketId];
    }

    function getBettorCount(uint256 marketId) external view returns (uint256) {
        return _bettors[marketId].length;
    }

    function marketCount() external view returns (uint256) {
        return _marketCount;
    }

    function getMarketIds() external view returns (uint256[] memory) {
        return _marketIds;
    }

    /**
     * @notice Potential payout if `side` wins, for an additional `betAmount` bet now.
     * @dev Helps UI show "if you bet X on A and A wins, you get ~Y".
     */
    function previewPayout(
        uint256 marketId,
        Outcome side,
        uint256 betAmount
    ) external view marketExists(marketId) returns (uint256 estimatedPayout) {
        if (betAmount == 0) return 0;
        Market storage m = _markets[marketId];

        uint256 fee = (betAmount * betFeeBps) / BPS_DENOMINATOR;
        uint256 net = betAmount - fee;

        if (side == Outcome.OptionA) {
            uint256 newSharesA = m.sharesA + net;
            uint256 losingPool = m.stakedB;
            estimatedPayout = net;
            if (newSharesA > 0 && losingPool > 0) {
                estimatedPayout += (net * losingPool) / newSharesA;
            }
        } else if (side == Outcome.OptionB) {
            uint256 newSharesB = m.sharesB + net;
            uint256 losingPool = m.stakedA;
            estimatedPayout = net;
            if (newSharesB > 0 && losingPool > 0) {
                estimatedPayout += (net * losingPool) / newSharesB;
            }
        }
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _safeTransfer(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // Accept direct funding (e.g. seeding liquidity for early markets)
    receive() external payable {}
}
