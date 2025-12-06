const CAMP_RPC_URL = "https://rpc.basecamp.t.raas.gelato.cloud";

const go = async (contractAddress, requiredBalance) => {
	// Check if the user has the required ERC20 token balance
	// Parameters:
	// - contractAddress: The ERC20 token contract address
	// - userAddress: The address to check balance for
	// - requiredBalance: Minimum balance required (in wei)

	try {
		// Create a provider using ethers v5 (globally available in Lit Actions)
		const provider = new ethers.providers.JsonRpcProvider(CAMP_RPC_URL);
		const userAddress = Lit.Auth.authSigAddress;

		// ERC20 ABI for balanceOf function
		const erc20Abi = [
			"function balanceOf(address account) view returns (uint256)",
		];

		// Create contract instance
		const contract = new ethers.Contract(contractAddress, erc20Abi, provider);

		// Get the balance
		const balance = await contract.balanceOf(userAddress);

		console.log(`User ${userAddress} has balance: ${balance.toString()}`);
		console.log(`Required balance: ${requiredBalance}`);

		// Check if balance meets the requirement
		// Use ethers BigNumber comparison
		return balance.gte(ethers.BigNumber.from(requiredBalance));
	} catch (e) {
		console.log("Error checking ERC20 balance:", e);
		return false;
	}
};
