import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  const oracleAddress = process.env.ORACLE_ADDRESS;

  if (!rpcUrl || !privateKey) {
    throw new Error("RPC_URL and PRIVATE_KEY are required to deploy the escrow contract.");
  }

  const solcModule = await import("solc");
  const solc = "compile" in solcModule ? solcModule : solcModule.default;
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const contractPath = path.resolve(currentDir, "../contracts/ThamBunEscrow.sol");
  const source = await readFile(contractPath, "utf8");
  const input = {
    language: "Solidity",
    sources: {
      "ThamBunEscrow.sol": {
        content: source
      }
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"]
        }
      }
    }
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const artifact = output.contracts?.["ThamBunEscrow.sol"]?.ThamBunEscrow;

  if (!artifact?.abi || !artifact?.evm?.bytecode?.object) {
    throw new Error("Contract compilation failed.");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.evm.bytecode.object, signer);
  const contract = await factory.deploy(oracleAddress ?? signer.address);
  await contract.waitForDeployment();

  console.log(`Escrow contract deployed to ${await contract.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
