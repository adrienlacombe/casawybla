import { RpcProvider, Account, json, ETransactionVersion, hash as starkHash } from "starknet";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC_URL = process.env.STARKNET_RPC_URL;
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS;
const DEPLOYER_PK = process.env.DEPLOYER_PK;

if (!RPC_URL || !DEPLOYER_ADDRESS || !DEPLOYER_PK) {
  console.error("Missing required environment variables: STARKNET_RPC_URL, DEPLOYER_ADDRESS, DEPLOYER_PK");
  process.exit(1);
}

async function main() {
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  // starknet.js v9: Account takes an options object
  const account = new Account({
    provider,
    address: DEPLOYER_ADDRESS,
    signer: DEPLOYER_PK,
  });

  const sierraPath = path.join(__dirname, "../contracts/target/dev/argent_ArgentAccount.contract_class.json");
  const casmPath = path.join(__dirname, "../contracts/target/dev/argent_ArgentAccount.compiled_contract_class.json");

  const sierra = json.parse(fs.readFileSync(sierraPath, "utf-8"));
  const casm = json.parse(fs.readFileSync(casmPath, "utf-8"));

  const classHash = starkHash.computeContractClassHash(sierra);
  const compiledClassHash = starkHash.computeCompiledClassHash(casm);

  console.log("Class hash (Sierra):", classHash);
  console.log("Compiled class hash (CASM):", compiledClassHash);

  const nonce = await account.getNonce();
  console.log("Current nonce:", nonce);

  try {
    // Pass resourceBounds in the details (second arg) to keep gas within balance (~10 STRK)
    const declareResponse = await account.declare(
      { contract: sierra, casm },
      {
        version: ETransactionVersion.V3,
        resourceBounds: {
          l1_gas: { max_amount: 0n, max_price_per_unit: 70000000000000n },
          l2_gas: { max_amount: 4000000000n, max_price_per_unit: 12000000000n },
          l1_data_gas: { max_amount: 512n, max_price_per_unit: 200000000n },
        },
      },
    );
    console.log("Declare tx hash:", declareResponse.transaction_hash);
    console.log("Class hash:", declareResponse.class_hash);

    console.log("Waiting for confirmation...");
    await provider.waitForTransaction(declareResponse.transaction_hash);
    console.log("Declared successfully!");
    console.log("\nUpdate ACCOUNT_CLASS_HASH in webapp/src/lib/constants.ts to:");
    console.log(declareResponse.class_hash);
  } catch (err) {
    console.error("Declare failed:", err.baseError || err.message || err);
    throw err;
  }
}

main().catch(() => process.exit(1));
