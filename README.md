# CASAWYL

**Bitcoin Ledger x Starknet Account** — a POC that connects a Ledger hardware wallet (Bitcoin app) to deploy and control an Argent account on Starknet Sepolia.

The Ledger Bitcoin app produces secp256k1 signatures wrapped with the Bitcoin message prefix and double SHA-256. A forked Argent v0.5.0 contract adds a `Bitcoin` signer variant that reconstructs this format on-chain before verifying.

## Architecture

```
contracts/   Cairo contracts (forked Argent v0.5.0 + Bitcoin signer)
webapp/      React + Vite frontend (Ledger WebHID, starknet.js)
scripts/     Deployment utilities
```

## Quick Start

### Contracts

See [`contracts/README.md`](contracts/README.md) for build/test instructions. Requires Scarb 2.10.1 and snforge 0.38.3.

### Webapp

```bash
cd webapp
npm install

# (Optional) Set a custom RPC endpoint
cp .env.example .env
# Edit .env with your Dwellir/Alchemy/Blast API key

npm run dev
```

Open the app in a browser, connect a Ledger with the Bitcoin app open, and follow the step-by-step wizard:

1. **Connect Ledger** — derives a secp256k1 public key, computes the pubkey hash
2. **View Account** — shows the counterfactual Starknet address and balances
3. **Deploy** — deploys the Argent account (requires pre-funding via Sepolia faucet)
4. **Transfer** — sends ERC-20 tokens from the account

Multi-account support is available via the account index selector (BIP44 derivation path `44'/0'/0'/0/{i}`).

## How It Works

1. The **Ledger Bitcoin app** signs a 32-byte message (the Starknet tx hash) using `signMessage`, which wraps it as `SHA256(SHA256("\x18Bitcoin Signed Message:\n" + varint(32) + msg))`
2. The **frontend** normalizes the signature (low-s) and serializes it in Argent's account signature format
3. The **on-chain contract** reconstructs the same Bitcoin message envelope, double-SHA256s it, recovers the secp256k1 public key, and verifies it matches the stored `pubkey_hash`

## License

[MIT](LICENSE)
