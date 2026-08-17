// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Pool} from "../src/Pool.sol";
import {AssetToken} from "../src/AssetToken.sol";
import {PolicyRegistry} from "../src/PolicyRegistry.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";

/// @dev Test payment token (mintable ERC20) standing in for WBOT.
contract MockUSDT {
    string public name = "Mock WBOT";
    string public symbol = "MWBT";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

contract AttestPayTest is Test {
    Pool pool;
    AssetToken apay;
    PolicyRegistry policy;
    AttestationRegistry attReg;
    MockUSDT wbot;

    address issuer = makeAddr("issuer");
    address investorA = makeAddr("investorA");
    address investorB = makeAddr("investorB");
    address investorC = makeAddr("investorC");
    address agent = makeAddr("agent");
    address owner = makeAddr("owner");
    address stranger = makeAddr("stranger");

    bytes32 constant EVIDENCE_HASH = keccak256("evidence");

    function setUp() public {
        wbot = new MockUSDT();
        // Fund participants with payment tokens.
        wbot.mint(issuer, 1000 ether);
        wbot.mint(investorA, 1000 ether);
        wbot.mint(investorB, 1000 ether);
        wbot.mint(investorC, 1000 ether);
        wbot.mint(address(this), 500 ether);

        pool = new Pool(address(wbot), owner, agent);
        apay = pool.assetToken();
        policy = pool.policyRegistry();
        attReg = pool.attestationRegistry();

        // Whitelist all participants (compliance onboarding).
        vm.startPrank(owner);
        pool.setWhitelisted(issuer, true);
        pool.setWhitelisted(investorA, true);
        pool.setWhitelisted(investorB, true);
        pool.setWhitelisted(investorC, true);
        pool.setWhitelisted(address(this), true);
        vm.stopPrank();
    }

    function _fundPool(uint256 amount) internal {
        vm.prank(address(this));
        wbot.transfer(address(pool), amount); // real-world income flows into the pool
    }

    function _attest(uint256 cycleId, uint256 gross) internal returns (bytes32 uid) {
        vm.prank(agent);
        uid = attReg.record(address(pool), cycleId, gross, EVIDENCE_HASH, "https://data.example/cycle-1");
    }

    function testFullCycle() public {
        // 1. Issuer subscribes 100 shares at face value.
        vm.startPrank(issuer);
        wbot.approve(address(pool), 100 ether);
        pool.subscribe(100 ether);
        vm.stopPrank();
        assertEq(apay.balanceOf(issuer), 100 ether);

        // 2. Investors buy.
        vm.startPrank(investorA);
        wbot.approve(address(pool), 40 ether);
        pool.buy(40 ether);
        vm.stopPrank();

        vm.startPrank(investorB);
        wbot.approve(address(pool), 30 ether);
        pool.buy(30 ether);
        vm.stopPrank();

        vm.startPrank(investorC);
        wbot.approve(address(pool), 20 ether);
        pool.buy(20 ether);
        vm.stopPrank();

        uint256 totalSupply = apay.totalSupply();
        assertEq(totalSupply, 190 ether);

        // 3. Income arrives (real-world WBOT inflow to pool).
        _fundPool(50 ether);

        // 4. Agent attests and distributes.
        uint256 cycleId = 1;
        bytes32 uid = _attest(cycleId, 50 ether);
        assertEq(attReg.count(), 1);

        vm.prank(agent);
        pool.distribute(50 ether, cycleId, uid);

        // Pro-rata check: shares 100/40/30/20 of 190 -> 26.315.../10.526.../7.894.../5.263...
        uint256 balIssuer = wbot.balanceOf(issuer);
        uint256 balA = wbot.balanceOf(investorA);
        uint256 balB = wbot.balanceOf(investorB);
        uint256 balC = wbot.balanceOf(investorC);
        uint256 expIssuer = uint256(50 ether) * 100 / 190;
        uint256 expA = uint256(50 ether) * 40 / 190;
        uint256 expB = uint256(50 ether) * 30 / 190;
        uint256 expC = uint256(50 ether) * 20 / 190;
        // Holders start with 1000 each, minus amounts paid in.
        assertApproxEqRel(balIssuer - 900 ether, expIssuer, 1e15); // 0.1% tolerance
        assertApproxEqRel(balA - 960 ether, expA, 1e15);
        assertApproxEqRel(balB - 970 ether, expB, 1e15);
        assertApproxEqRel(balC - 980 ether, expC, 1e15);

        Pool.Distribution memory d = pool.getDistribution(1);
        assertEq(d.cycleId, 1);
        assertEq(d.grossAmount, 50 ether);
        assertEq(d.recipientCount, 4);
        assertEq(d.totalPaid, 50 ether);

        // 5. Redeem: investor C withdraws prorata principal.
        vm.prank(investorC);
        pool.redeem(20 ether);
        assertEq(apay.balanceOf(investorC), 0);
        // C's principal share was paid out of remaining reserves.
        assertTrue(wbot.balanceOf(investorC) > 5 ether);
    }

    function testRejectNonAgentDistribute() public {
        vm.startPrank(issuer);
        wbot.approve(address(pool), 100 ether);
        pool.subscribe(100 ether);
        vm.stopPrank();
        _fundPool(10 ether);
        bytes32 uid = _attest(1, 10 ether);
        vm.prank(stranger);
        vm.expectRevert(Pool.OnlyAgent.selector);
        pool.distribute(10 ether, 1, uid);
    }

    function testRejectUnattestedDistribution() public {
        vm.startPrank(issuer);
        wbot.approve(address(pool), 100 ether);
        pool.subscribe(100 ether);
        vm.stopPrank();
        _fundPool(10 ether);
        bytes32 fake = keccak256("nope");
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(Pool.BadAttestation.selector, fake));
        pool.distribute(10 ether, 1, fake);
    }

    function testTransferBlockedForNonWhitelisted() public {
        vm.startPrank(issuer);
        wbot.approve(address(pool), 100 ether);
        pool.subscribe(100 ether);
        vm.stopPrank();

        vm.prank(issuer);
        vm.expectRevert(
            abi.encodeWithSelector(
                AssetToken.TransferBlocked.selector, issuer, stranger, 10 ether, "recipient-not-whitelisted"
            )
        );
        apay.transfer(stranger, 10 ether);
    }

    function testHolderCapEnforcedOnBuy() public {
        vm.startPrank(owner);
        pool.setHolderCap(investorA, 25 ether);
        vm.stopPrank();

        vm.startPrank(investorA);
        wbot.approve(address(pool), 30 ether);
        vm.expectRevert(abi.encodeWithSelector(Pool.CapExceeded.selector, investorA, 25 ether));
        pool.buy(30 ether);
        vm.stopPrank();
    }

    function testWhitelistedTransferWithinCap() public {
        vm.startPrank(issuer);
        wbot.approve(address(pool), 100 ether);
        pool.subscribe(100 ether);
        vm.stopPrank();
        vm.startPrank(owner);
        pool.setHolderCap(investorA, 50 ether);
        vm.stopPrank();

        vm.prank(issuer);
        apay.transfer(investorA, 30 ether);
        assertEq(apay.balanceOf(investorA), 30 ether);
        assertEq(apay.balanceOf(issuer), 70 ether);
    }

    function testRedeemMoreThanBalanceReverts() public {
        // Pool must have supply so redemption reaches the burn step.
        vm.startPrank(issuer);
        wbot.approve(address(pool), 100 ether);
        pool.subscribe(100 ether);
        vm.stopPrank();
        vm.startPrank(investorA);
        vm.expectRevert(abi.encodeWithSelector(AssetToken.InsufficientBalance.selector, investorA, 1 ether));
        pool.redeem(1 ether);
        vm.stopPrank();
    }
}
