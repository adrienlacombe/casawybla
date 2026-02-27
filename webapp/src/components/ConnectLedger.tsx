import { useState } from "react";
import { getBtcPublicKey, disconnectLedger } from "../lib/ledger";
import { pubkeyToPubkeyHash } from "../lib/crypto";

interface Props {
  onConnected: (pubkeyHash: string, publicKey: string) => void;
  accountIndex: number;
}

export function ConnectLedger({ onConnected, accountIndex }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { publicKey } = await getBtcPublicKey(accountIndex);
      const pubkeyHash = pubkeyToPubkeyHash(publicKey);
      setConnected(true);
      onConnected(pubkeyHash, publicKey);
    } catch (err: any) {
      setError(err.message || "Failed to connect Ledger");
      console.error("Ledger connection error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectLedger();
    setConnected(false);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h2>1. Connect Ledger</h2>
      <p>Open the Bitcoin app on your Ledger device, then click Connect.</p>
      {!connected ? (
        <button onClick={handleConnect} disabled={loading}>
          {loading ? "Connecting..." : "Connect Ledger"}
        </button>
      ) : (
        <button onClick={handleDisconnect}>Disconnect</button>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
