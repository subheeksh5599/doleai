// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Pool} from "../src/Pool.sol";
import {AssetToken} from "../src/AssetToken.sol";
import {PolicyRegistry} from "../src/PolicyRegistry.sol";
import {AttestationRegistry} from "../src/AttestationRegistry.sol";

/// @notice Dev-only mintable ERC20 used as a stand-in payment token for local
///         anvil smoke tests (NEVER deployed to testnet/mainnet).
contract MintableToken {
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

/// @notice Deploys an DoleAI pool. Reads config from env, never hardcodes:
///   ATTESTPAY_PAYMENT_TOKEN - WBOT (or any ERC20) address
///   ATTESTPAY_OWNER        - owner address
///   ATTESTPAY_AGENT        - authorized AI-agent signer address
///   ATTESTPAY_DEPLOY_MOCK  - "1" to deploy a dev-only mintable token (anvil tests)
///   PRIVATE_KEY            - deployer private key
contract DeployPool is Script {
    function run() external returns (Pool pool) {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPk);

        address paymentToken;
        if (vm.envOr("ATTESTPAY_DEPLOY_MOCK", uint256(0)) == 1) {
            paymentToken = address(new MintableToken());
            console2.log("Deployed dev mock payment token at:", paymentToken);
        } else {
            paymentToken = vm.envAddress("ATTESTPAY_PAYMENT_TOKEN");
        }
        address owner = vm.envAddress("ATTESTPAY_OWNER");
        address agent = vm.envAddress("ATTESTPAY_AGENT");

        pool = new Pool(paymentToken, owner, agent);

        vm.stopBroadcast();

        console2.log("Pool deployed at:", address(pool));
        console2.log("AssetToken:", address(pool.assetToken()));
        console2.log("PolicyRegistry:", address(pool.policyRegistry()));
        console2.log("AttestationRegistry:", address(pool.attestationRegistry()));
        console2.log("PaymentToken:", paymentToken);
        console2.log("Owner:", owner);
        console2.log("Agent:", agent);
    }
}

// Onboarding (whitelist/caps) is performed via `cast send` by the owner.
// Example:
//   cast send $POOL "setWhitelisted(address,bool)" $ADDR true --rpc-url https://rpc.bohr.life --private-key $OWNER_PK
