import { beforeAll, describe, it } from "vitest";
import { Account, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { runExample } from "./example.js";

const getEnv = (key: string) => {
	const value = process.env[key];
	if (!value) {
		throw new Error(`Environment variable ${key} is not set`);
	}
	return value;
};

describe(runExample, () => {
	let delegatorAccount: Account;
	let delegateeAccount: Account;

	beforeAll(() => {
		delegatorAccount = privateKeyToAccount(
			getEnv("DELEGATOR_ETH_PRIVATE_KEY") as Hex,
		);
		delegateeAccount = privateKeyToAccount(
			getEnv("DELEGATEE_ETH_PRIVATE_KEY") as Hex,
		);
	});

	it("runs the example", async () => {
		await runExample({ delegatorAccount, delegateeAccount });
	}, 60000); // 60 second timeout for network operations
});
