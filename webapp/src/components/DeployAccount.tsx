import { useState } from "react";
import { deployAccount } from "../lib/deploy";

interface Props {
  pubkeyHash: string | null;
  accountAddress: string | null;
  isDeployed: boolean;
  accountIndex: number;
}

export function DeployAccount({ pubkeyHash, accountAddress, isDeployed: deployed, accountIndex }: Props) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!pubkeyHash || !accountAddress) return null;
  if (deployed) {
    return (
      <div style={{ marginBottom: 24 }}>
        <h2>3. Deploy Account</h2>
        <p>Account is already deployed.</p>
      </div>
    );
  }

  const handleDeploy = async () => {
    setLoading(true);
    setError(null);
    try {
      const hash = await deployAccount(pubkeyHash, accountIndex);
      setTxHash(hash);
    } catch (err: any) {
      setError(err.message || "Deploy failed");
      console.error("Deploy error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h2>3. Deploy Account</h2>
      <p>
        Fund the address above with Sepolia ETH/STRK first (use a faucet), then
        deploy.
      </p>
      <button onClick={handleDeploy} disabled={loading}>
        {loading ? "Deploying... (check Ledger)" : "Deploy Account"}
      </button>
      {txHash && (
        <p>
          Deployed! Tx:{" "}
          <a
            href={`https://sepolia.starkscan.co/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: "monospace", fontSize: 12 }}
          >
            {txHash}
          </a>
        </p>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
