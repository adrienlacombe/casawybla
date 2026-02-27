import {
  type SignerInterface,
  type Signature,
  type Call,
  type DeclareSignerDetails,
  type DeployAccountSignerDetails,
  type InvocationsSignerDetails,
  type TypedData,
  hash,
  transaction,
  CallData,
} from "starknet";
import { signWithBtcApp } from "./ledger";
import { txHashToMessageHex, normalizeSignature } from "./crypto";

/**
 * Splits a bigint into low/high 128-bit felt252 values for Cairo serialization.
 */
function splitU256(value: bigint): [string, string] {
  const mask = (1n << 128n) - 1n;
  const low = value & mask;
  const high = value >> 128n;
  return ["0x" + low.toString(16), "0x" + high.toString(16)];
}

/** Convert DA mode string ("L1"/"L2") to numeric (0/1) as required by hash functions */
function intDAM(dam: any): number {
  if (typeof dam === "number") return dam;
  if (dam === "L1" || dam === 0) return 0;
  if (dam === "L2" || dam === 1) return 1;
  return 0;
}

/**
 * Custom signer that uses the Ledger Bitcoin app to sign Starknet transactions.
 * The signature format matches Argent's `parse_account_signature` expectations.
 */
export class BitcoinLedgerSigner implements SignerInterface {
  private pubkeyHash: string;
  private accountIndex: number;

  constructor(pubkeyHash: string, accountIndex: number = 0) {
    this.pubkeyHash = pubkeyHash;
    this.accountIndex = accountIndex;
  }

  async getPubKey(): Promise<string> {
    return this.pubkeyHash;
  }

  async signMessage(
    _typedData: TypedData,
    _accountAddress: string
  ): Promise<Signature> {
    throw new Error("signMessage not implemented");
  }

  async signTransaction(
    transactions: Call[],
    details: InvocationsSignerDetails
  ): Promise<Signature> {
    const compiledCalldata = transaction.getExecuteCalldata(
      transactions,
      details.cairoVersion || "1"
    );
    const det = details as any;
    const msgHash = hash.calculateInvokeTransactionHash({
      ...det,
      senderAddress: det.walletAddress || det.senderAddress,
      compiledCalldata,
      version: det.version,
      paymasterData: det.paymasterData || [],
      accountDeploymentData: det.accountDeploymentData || [],
      nonceDataAvailabilityMode: intDAM(det.nonceDataAvailabilityMode),
      feeDataAvailabilityMode: intDAM(det.feeDataAvailabilityMode),
      tip: det.tip ?? 0,
    });
    return this.signHash(msgHash);
  }

  async signDeployAccountTransaction(
    details: DeployAccountSignerDetails
  ): Promise<Signature> {
    const compiledConstructorCalldata = CallData.compile(
      details.constructorCalldata
    );
    const det = details as any;
    const msgHash = hash.calculateDeployAccountTransactionHash({
      ...det,
      salt: det.addressSalt,
      compiledConstructorCalldata,
      version: det.version,
      paymasterData: det.paymasterData || [],
      accountDeploymentData: det.accountDeploymentData || [],
      nonceDataAvailabilityMode: intDAM(det.nonceDataAvailabilityMode),
      feeDataAvailabilityMode: intDAM(det.feeDataAvailabilityMode),
      tip: det.tip ?? 0,
    });
    return this.signHash(msgHash);
  }

  async signDeclareTransaction(
    _details: DeclareSignerDetails
  ): Promise<Signature> {
    throw new Error("signDeclareTransaction not implemented");
  }

  /**
   * Core signing method: sends the tx hash to the Ledger Bitcoin app,
   * normalizes the signature, and returns it in Argent's expected format.
   *
   * Format: [1, 5, pubkey_hash, r_low, r_high, s_low, s_high, y_parity]
   */
  async signHash(txHash: string): Promise<Signature> {
    const messageHex = txHashToMessageHex(txHash);

    const rawSig = await signWithBtcApp(messageHex, this.accountIndex);
    const normalized = normalizeSignature(rawSig.r, rawSig.s, rawSig.v);

    const [rLow, rHigh] = splitU256(normalized.r);
    const [sLow, sHigh] = splitU256(normalized.s);
    const yParity = normalized.v; // 0 = even, 1 = odd

    // Argent account signature format:
    // [sig_count, signer_type_variant, signer_data..., sig_data...]
    return [
      "1", // 1 signature (owner only, no guardian)
      "5", // SignerSignature::Bitcoin variant index
      this.pubkeyHash, // BitcoinSigner { pubkey_hash }
      rLow,
      rHigh,
      sLow,
      sHigh,
      yParity.toString(),
    ];
  }
}
