import { nagaTest } from "@lit-protocol/networks";
import { createLitClient } from "@lit-protocol/lit-client";
import { createAuthManager, storagePlugins } from "@lit-protocol/auth";
import { Account } from "viem";
import { createAccBuilder } from "@lit-protocol/access-control-conditions";

export const runExample = async ({
	delegatorAccount,
	delegateeAccount,
}: {
	delegatorAccount: Account;
	delegateeAccount: Account;
}) => {
	const litClient = await createLitClient({
		// @ts-expect-error - TODO: fix this
		network: nagaTest,
	});

	const paymentManager = await litClient.getPaymentManager({
		account: delegatorAccount,
	});

	await paymentManager.setRestriction({
		totalMaxPrice: "1000000000000000000", // 1 ETH equivalent limit
		requestsPerPeriod: "100", // max number of sponsored requests in a period
		periodSeconds: "3600", // rolling window (1 hour in this example)
	});

	await paymentManager.delegatePaymentsBatch({
		userAddresses: [delegateeAccount.address],
	});

	const delegatorBalance = await paymentManager.getBalance({
		userAddress: delegatorAccount.address,
	});
	const delegateeBalance = await paymentManager.getBalance({
		userAddress: delegateeAccount.address,
	});

	console.log("Balances:", { delegatorBalance, delegateeBalance });

	// Build access control conditions
	const builder = createAccBuilder();

	const accs = builder
		.requireWalletOwnership(delegateeAccount.address)
		.on("ethereum")
		.and()
		.requireEthBalance("0", "=")
		.on("yellowstone")
		.build();

	// delegatorAccount encrypts data (no AuthContext needed)
	const encryptedData = await litClient.encrypt({
		dataToEncrypt: "Hello, my love! ❤️",
		unifiedAccessControlConditions: accs,
		chain: "ethereum",
		// metadata: { dataType: 'string' }, // auto-inferred
	});
	console.log("Encrypted data:", encryptedData);

	const authManager = createAuthManager({
		storage: storagePlugins.localStorageNode({
			appName: "my-node-app",
			networkName: nagaTest.getNetworkName(),
			storagePath: "./lit-auth-storage",
		}),
	});

	// delegateeAccount needs AuthContext for decryption
	const authContext = await authManager.createEoaAuthContext({
		litClient,
		config: {
			account: delegateeAccount,
		},
		authConfig: {
			domain: "localhost",
			statement: "Decrypt test data",
			expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
			resources: [
				["access-control-condition-decryption", "*"],
				["lit-action-execution", "*"],
			],
		},
	});

	// delegateeAccount decrypts data (requires AuthContext)
	// The delegatee should use the delegated payment capacity from delegatorAccount
	const decryptedResponse = await litClient.decrypt({
		data: encryptedData,
		unifiedAccessControlConditions: accs,
		authContext,
		chain: "ethereum",
	});
	console.log("Decrypted response:", decryptedResponse);
};
