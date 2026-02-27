import { useState } from "react";
import { sendTransfer } from "../lib/transfer";
import { ETH_TOKEN, STRK_TOKEN } from "../lib/constants";

interface Props {
  pubkeyHash: string | null;
  accountAddress: string | null;
  isDeployed: boolean;
  accountIndex: number;
}

export function SendTransfer({ pubkeyHash, accountAddress, isDeployed: deployed, accountIndex }: Props) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<"ETH" | "STRK">("ETH");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!pubkeyHash || !accountAddress || !deployed) return null;

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const tokenAddress = token === "ETH" ? ETH_TOKEN : STRK_TOKEN;
      const amountWei = parseFloat(amount) * 1e18;
      const hash = await sendTransfer(
        accountAddress,
        pubkeyHash,
        tokenAddress,
        recipient,
        BigInt(Math.floor(amountWei)),
        accountIndex
      );
      setTxHash(hash);
    } catch (err: any) {
      setError(err.message || "Transfer failed");
      console.error("Transfer error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h2>4. Send Transfer</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500 }}>
        <label>
          Token:{" "}
          <select
            value={token}
            onChange={(e) => setToken(e.target.value as "ETH" | "STRK")}
          >
            <option value="ETH">ETH</option>
            <option value="STRK">STRK</option>
          </select>
        </label>
        <label>
          Recipient:
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            style={{ width: "100%", fontFamily: "monospace" }}
          />
        </label>
        <label>
          Amount:
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.001"
            style={{ width: "100%" }}
          />
        </label>
        <button onClick={handleSend} disabled={loading || !recipient || !amount}>
          {loading ? "Sending... (check Ledger)" : "Send Transfer"}
        </button>
      </div>
      {txHash && (
        <p>
          Sent! Tx:{" "}
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
