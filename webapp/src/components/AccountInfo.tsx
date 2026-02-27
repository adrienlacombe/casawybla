import { useEffect, useState } from "react";
import {
  calculateAccountAddress,
  isDeployed,
  getTokenBalance,
} from "../lib/starknet";
import { ETH_TOKEN, STRK_TOKEN } from "../lib/constants";

interface Props {
  pubkeyHash: string | null;
  publicKey: string | null;
  onAddressCalculated: (address: string, deployed: boolean) => void;
}

export function AccountInfo({
  pubkeyHash,
  publicKey,
  onAddressCalculated,
}: Props) {
  const [address, setAddress] = useState<string | null>(null);
  const [deployed, setDeployed] = useState(false);
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [strkBalance, setStrkBalance] = useState<string>("0");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pubkeyHash) return;
    const addr = calculateAccountAddress(pubkeyHash);
    setAddress(addr);
    refreshStatus(addr);
  }, [pubkeyHash]);

  const refreshStatus = async (addr: string) => {
    setLoading(true);
    try {
      const dep = await isDeployed(addr);
      setDeployed(dep);
      onAddressCalculated(addr, dep);

      const eth = await getTokenBalance(ETH_TOKEN, addr);
      setEthBalance(formatBalance(eth, 18));

      const strk = await getTokenBalance(STRK_TOKEN, addr);
      setStrkBalance(formatBalance(strk, 18));
    } catch (err) {
      console.error("Status check error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!pubkeyHash) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h2>2. Account Info</h2>
      <table>
        <tbody>
          <tr>
            <td>
              <strong>Public Key:</strong>
            </td>
            <td style={{ fontFamily: "monospace", fontSize: 12 }}>
              {publicKey}
            </td>
          </tr>
          <tr>
            <td>
              <strong>Pubkey Hash:</strong>
            </td>
            <td style={{ fontFamily: "monospace", fontSize: 12 }}>
              {pubkeyHash}
            </td>
          </tr>
          <tr>
            <td>
              <strong>Starknet Address:</strong>
            </td>
            <td style={{ fontFamily: "monospace", fontSize: 12 }}>{address}</td>
          </tr>
          <tr>
            <td>
              <strong>Status:</strong>
            </td>
            <td>{deployed ? "Deployed" : "Not deployed"}</td>
          </tr>
          <tr>
            <td>
              <strong>ETH Balance:</strong>
            </td>
            <td>{ethBalance} ETH</td>
          </tr>
          <tr>
            <td>
              <strong>STRK Balance:</strong>
            </td>
            <td>{strkBalance} STRK</td>
          </tr>
        </tbody>
      </table>
      {address && (
        <button
          onClick={() => refreshStatus(address)}
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      )}
    </div>
  );
}

function formatBalance(wei: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = wei / divisor;
  const fraction = wei % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 6);
  return `${whole}.${fractionStr}`;
}
