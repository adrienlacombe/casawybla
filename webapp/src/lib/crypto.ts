import { ProjectivePoint } from "@noble/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";

// secp256k1 curve order
const CURVE_ORDER = BigInt(
  "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"
);
const HALF_CURVE_ORDER = CURVE_ORDER / 2n;

/**
 * Converts a secp256k1 public key (compressed or uncompressed hex) to an Ethereum-style address.
 * keccak256 of the 64-byte uncompressed coordinates (without 0x04 prefix), last 20 bytes.
 */
export function pubkeyToPubkeyHash(publicKeyHex: string): string {
  let uncompressedBytes: Uint8Array;

  const raw = hexToBytes(publicKeyHex);

  if (raw.length === 33) {
    // Compressed key — decompress
    const point = ProjectivePoint.fromHex(raw);
    uncompressedBytes = point.toRawBytes(false); // 65 bytes: 04 || x || y
  } else if (raw.length === 65) {
    uncompressedBytes = raw;
  } else {
    throw new Error(`Unexpected public key length: ${raw.length}`);
  }

  // keccak256 of x || y (64 bytes, skip the 0x04 prefix)
  const hash = keccak_256(uncompressedBytes.slice(1));
  // Last 20 bytes
  const address = hash.slice(12);
  return "0x" + bytesToHex(address);
}

/**
 * Converts a Starknet tx hash to hex string suitable for Ledger signing.
 * Strips 0x prefix, pads to 64 hex chars (32 bytes).
 */
export function txHashToMessageHex(txHash: string): string {
  const hex = txHash.replace(/^0x/i, "").padStart(64, "0");
  return hex;
}

/**
 * Normalizes signature to enforce low-s as required by the contract.
 * If s > CURVE_ORDER/2, flip s and toggle v.
 */
export function normalizeSignature(
  r: string,
  s: string,
  v: number
): { r: bigint; s: bigint; v: number } {
  let rBig = BigInt("0x" + r);
  let sBig = BigInt("0x" + s);

  if (sBig > HALF_CURVE_ORDER) {
    sBig = CURVE_ORDER - sBig;
    v = v ^ 1;
  }

  return { r: rBig, s: sBig, v };
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
