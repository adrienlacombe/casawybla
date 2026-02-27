// Class hash of our modified Argent account with Bitcoin signer support (declared on Sepolia)
export const ACCOUNT_CLASS_HASH =
  "0x270accc6dbe5d6b7e107987511b06626e02200e5accb6fa6f3fbb35e4607df2";

// Starknet Sepolia RPC — set VITE_SEPOLIA_RPC in .env for a custom endpoint
export const SEPOLIA_RPC =
  import.meta.env.VITE_SEPOLIA_RPC || "https://free-rpc.nethermind.io/sepolia-juno/v0_7";

// BIP44 derivation path for Bitcoin mainnet (used by Ledger Bitcoin app)
// Varying the last index derives a different keypair → different Starknet account
export function getBtcDerivationPath(accountIndex: number): string {
  return `44'/0'/0'/0/${accountIndex}`;
}

// ERC-20 token addresses on Starknet Sepolia
export const ETH_TOKEN =
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
export const STRK_TOKEN =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
