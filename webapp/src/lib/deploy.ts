import { Account, CallData } from "starknet";
import { ACCOUNT_CLASS_HASH } from "./constants";
import { BitcoinLedgerSigner } from "./signer";
import { getProvider, calculateAccountAddress } from "./starknet";

/**
 * Deploys the Argent account with Bitcoin signer on Starknet Sepolia.
 *
 * The account must be pre-funded with ETH/STRK for gas before calling this.
 */
export async function deployAccount(pubkeyHash: string, accountIndex: number = 0): Promise<string> {
  const provider = getProvider();
  const signer = new BitcoinLedgerSigner(pubkeyHash, accountIndex);

  const constructorCalldata = [
    "5", // Signer::Bitcoin variant index
    pubkeyHash, // BitcoinSigner { pubkey_hash }
    "1", // Option::None (no guardian)
  ];

  const addressSalt = pubkeyHash;
  const accountAddress = calculateAccountAddress(pubkeyHash);

  // Create Account instance with the counterfactual address (v9 options object)
  const account = new Account({ provider, address: accountAddress, signer, cairoVersion: "1" });

  const deployPayload = {
    classHash: ACCOUNT_CLASS_HASH,
    constructorCalldata,
    addressSalt,
    contractAddress: accountAddress,
  };

  // secp256k1 recovery + double SHA256 is gas-intensive; use higher L2 gas bounds
  const { transaction_hash } = await account.deployAccount(deployPayload, {
    resourceBounds: {
      l1_gas: { max_amount: 0n, max_price_per_unit: 100000000000000n },
      l2_gas: { max_amount: 300000000n, max_price_per_unit: 12000000000n },
      l1_data_gas: { max_amount: 1024n, max_price_per_unit: 1000000000n },
    },
  });

  // Wait for confirmation
  await provider.waitForTransaction(transaction_hash);

  return transaction_hash;
}
