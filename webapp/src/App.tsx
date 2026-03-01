import { useState } from "react";
import { ConnectLedger } from "./components/ConnectLedger";
import { AccountInfo } from "./components/AccountInfo";
import { DeployAccount } from "./components/DeployAccount";
import { SendTransfer } from "./components/SendTransfer";

export default function App() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [pubkeyHash, setPubkeyHash] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [deployed, setDeployed] = useState(false);

  const handleConnected = (hash: string, pubkey: string) => {
    setPubkeyHash(hash);
    setPublicKey(pubkey);
  };

  const handleAddressCalculated = (address: string, isDeployed: boolean) => {
    setAccountAddress(address);
    setDeployed(isDeployed);
  };

  const changeAccountIndex = (delta: number) => {
    const newIndex = Math.max(0, accountIndex + delta);
    if (newIndex === accountIndex) return;
    setAccountIndex(newIndex);
    // Reset derived state so the UI re-triggers connect for the new index
    setPubkeyHash(null);
    setPublicKey(null);
    setAccountAddress(null);
    setDeployed(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>casawybla</h1>
      <p>Bitcoin Ledger x Starknet Account POC</p>
      <hr />

      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <strong>Account Index:</strong>
        <button onClick={() => changeAccountIndex(-1)} disabled={accountIndex === 0}>
          Prev
        </button>
        <span style={{ fontFamily: "monospace", fontSize: 18 }}>{accountIndex}</span>
        <button onClick={() => changeAccountIndex(1)}>
          Next
        </button>
        <span style={{ color: "#666", fontSize: 13 }}>
          (BIP44 path: 44'/0'/0'/0/{accountIndex})
        </span>
      </div>

      <ConnectLedger onConnected={handleConnected} accountIndex={accountIndex} />

      <AccountInfo
        pubkeyHash={pubkeyHash}
        publicKey={publicKey}
        onAddressCalculated={handleAddressCalculated}
      />

      <DeployAccount
        pubkeyHash={pubkeyHash}
        accountAddress={accountAddress}
        isDeployed={deployed}
        accountIndex={accountIndex}
      />

      <SendTransfer
        pubkeyHash={pubkeyHash}
        accountAddress={accountAddress}
        isDeployed={deployed}
        accountIndex={accountIndex}
      />
    </div>
  );
}
