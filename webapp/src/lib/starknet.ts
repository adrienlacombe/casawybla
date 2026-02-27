import { RpcProvider, hash, CallData } from "starknet";
import { SEPOLIA_RPC, ACCOUNT_CLASS_HASH } from "./constants";

let provider: RpcProvider | null = null;

export function getProvider(): RpcProvider {
  if (!provider) {
    provider = new RpcProvider({ nodeUrl: SEPOLIA_RPC });
  }
  return provider;
}

/**
 * Calculates the counterfactual Starknet account address for a given Bitcoin signer pubkey hash.
 *
 * Constructor calldata for Argent account with Bitcoin signer:
 *   Signer::Bitcoin(BitcoinSigner { pubkey_hash }) = [5, pubkey_hash]
 *   Option::<Signer>::None = [1]   (Cairo Serde: variant index 1 for None)
 *
 * Full calldata: [5, pubkey_hash, 1]
 */
export function calculateAccountAddress(
  pubkeyHash: string,
  salt?: string
): string {
  const constructorCalldata = [
    "5", // Signer::Bitcoin variant index
    pubkeyHash, // BitcoinSigner { pubkey_hash }
    "1", // Option::None (no guardian)
  ];

  const addressSalt = salt || pubkeyHash;

  const address = hash.calculateContractAddressFromHash(
    addressSalt,
    ACCOUNT_CLASS_HASH,
    constructorCalldata,
    0 // deployer address (0 = universal deployer)
  );

  // Zero-pad to full 66-char format (0x + 64 hex) for wallet compatibility
  return "0x" + address.replace(/^0x/, "").padStart(64, "0");
}

/**
 * Checks whether a contract is deployed at the given address.
 */
export async function isDeployed(address: string): Promise<boolean> {
  try {
    const classHash = await getProvider().getClassHashAt(address);
    return !!classHash;
  } catch {
    return false;
  }
}

/**
 * Gets the balance of a token for a given account address.
 */
export async function getTokenBalance(
  tokenAddress: string,
  accountAddress: string
): Promise<bigint> {
  try {
    const result = await getProvider().callContract({
      contractAddress: tokenAddress,
      entrypoint: "balanceOf",
      calldata: CallData.compile({ account: accountAddress }),
    });
    // ERC-20 balance returns u256 as [low, high]
    const low = BigInt(result[0]);
    const high = BigInt(result[1]);
    return low + (high << 128n);
  } catch {
    return 0n;
  }
}
