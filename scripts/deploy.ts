import "dotenv/config";

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    throw new Error("RPC_URL and PRIVATE_KEY are required to deploy the escrow contract.");
  }

  throw new Error("Compile/deploy tooling is not wired yet. Add Hardhat or Foundry before running this script.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
