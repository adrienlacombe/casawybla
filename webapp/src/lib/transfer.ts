import { Account, uint256, CallData } from "starknet";
import { BitcoinLedgerSigner } from "./signer";
import { getProvider } from "./starknet";

/**
 * Sends an ERC-20 token transfer from the deployed Argent account.
 */
export async function sendTransfer(
  accountAddress: string,
  pubkeyHash: string,
  tokenAddress: string,
  recipient: string,
  amount: bigint,
  accountIndex: number = 0
): Promise<string> {
  const provider = getProvider();
  const signer = new BitcoinLedgerSigner(pubkeyHash, accountIndex);
  const account = new Account({ provider, address: accountAddress, signer, cairoVersion: "1" });

  const u256Amount = uint256.bnToUint256(amount);

  // secp256k1 recovery + double SHA256 is gas-intensive; use higher L2 gas bounds
  const { transaction_hash } = await account.execute(
    {
      contractAddress: tokenAddress,
      entrypoint: "transfer",
      calldata: CallData.compile({
        recipient,
        amount: u256Amount,
      }),
    },
    {
      resourceBounds: {
        l1_gas: { max_amount: 0n, max_price_per_unit: 100000000000000n },
        l2_gas: { max_amount: 300000000n, max_price_per_unit: 12000000000n },
        l1_data_gas: { max_amount: 1024n, max_price_per_unit: 1000000000n },
      },
    },
  );

  // Wait for confirmation
  await provider.waitForTransaction(transaction_hash);

  return transaction_hash;
}
