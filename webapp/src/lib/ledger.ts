import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import type Transport from "@ledgerhq/hw-transport";
import Btc from "@ledgerhq/hw-app-btc";
import { getBtcDerivationPath } from "./constants";

let transport: Transport | null = null;
let btcApp: Btc | null = null;

export async function connectLedger(): Promise<Btc> {
  if (btcApp) return btcApp;
  transport = await TransportWebHID.create();
  btcApp = new Btc({ transport });
  return btcApp;
}

export async function getBtcPublicKey(accountIndex: number = 0): Promise<{
  publicKey: string;
  bitcoinAddress: string;
}> {
  const app = await connectLedger();
  const path = getBtcDerivationPath(accountIndex);
  const result = await app.getWalletPublicKey(path);
  return {
    publicKey: result.publicKey,
    bitcoinAddress: result.bitcoinAddress,
  };
}

export async function signWithBtcApp(
  messageHex: string,
  accountIndex: number = 0
): Promise<{ v: number; r: string; s: string }> {
  const app = await connectLedger();
  const path = getBtcDerivationPath(accountIndex);
  // signMessage takes (path, messageHex) where messageHex is a hex string
  const result = await app.signMessage(path, messageHex);
  // signMessage returns v as recovery id (0 or 1) directly
  return {
    v: result.v,
    r: result.r,
    s: result.s,
  };
}

export async function disconnectLedger(): Promise<void> {
  if (transport) {
    await transport.close();
    transport = null;
    btcApp = null;
  }
}
