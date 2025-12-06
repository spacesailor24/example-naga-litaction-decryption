import { beforeAll, describe, it, expect } from "vitest";
import { Account, Hex, parseEther, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { runExample } from "./example.js";
import { deployTestToken, mintTokens, getBalance } from "./erc20.js";
import { uploadLitActionToIpfs } from "./uploadToIpfs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getEnv = (key: string) => {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Environment variable ${key} is not set`);
	}
	return value;
};

describe("ERC20-gated decryption", () => {
	let delegatorAccount: Account;
	let delegateeAccount: Account;
	let contractAddress: Address;
	let contractAbi: any;
	let ipfsCid: string;
	const requiredBalance = parseEther("1").toString(); // Require 1 token

	beforeAll(async () => {
		delegatorAccount = privateKeyToAccount(
			getEnv("DELEGATOR_ETH_PRIVATE_KEY") as Hex,
		);
		delegateeAccount = privateKeyToAccount(
			getEnv("DELEGATEE_ETH_PRIVATE_KEY") as Hex,
		);

		// Upload the Lit Action to IPFS
		console.log("\n=== Uploading Lit Action to IPFS ===");
		const litActionCode = readFileSync(
			join(__dirname, "litAction.js"),
			"utf-8",
		);
		ipfsCid = await uploadLitActionToIpfs(litActionCode);
		console.log(`Lit Action CID: ${ipfsCid}`);

		// Deploy the ERC20 test token
		console.log("\n=== Deploying ERC20 Test Token ===");
		const deployment = await deployTestToken({
			account: delegatorAccount,
			name: "Test Token",
			symbol: "TEST",
			decimals: 18,
		});
		contractAddress = deployment.address;
		contractAbi = deployment.abi;
		console.log(`Token deployed at: ${contractAddress}`);
	}, 120000); // 2 minute timeout for deployment

	it("should fail to decrypt when delegatee has no ERC20 balance", async () => {
		// Verify delegatee has zero balance
		const balance = await getBalance({
			contractAddress,
			abi: contractAbi,
			address: delegateeAccount.address,
		});
		console.log(`Delegatee balance: ${balance.toString()}`);
		expect(balance).toBe(0n);

		let didFail = false;
		try {
			await runExample({
				delegatorAccount,
				delegateeAccount,
				contractAddress,
				requiredBalance,
				ipfsCid,
			});
		} catch (error) {
			didFail = true;
			console.log("Decryption failed as expected:", error);
		}

		expect(didFail).toBe(true);
	}, 120000);

	it("should succeed to decrypt when delegatee has sufficient ERC20 balance", async () => {
		// Mint tokens to delegatee
		await mintTokens({
			account: delegatorAccount,
			contractAddress,
			abi: contractAbi,
			to: delegateeAccount.address,
			amount: "10", // Mint 10 tokens (more than required)
		});

		// Verify delegatee now has balance
		const balance = await getBalance({
			contractAddress,
			abi: contractAbi,
			address: delegateeAccount.address,
		});
		console.log(`Delegatee balance after mint: ${balance.toString()}`);
		expect(balance).toBeGreaterThanOrEqual(parseEther("1"));

		await runExample({
			delegatorAccount,
			delegateeAccount,
			contractAddress,
			requiredBalance,
			ipfsCid,
		});

		console.log("Decryption succeeded!");
	}, 120000);
});
