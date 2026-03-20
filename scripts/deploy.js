const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying AgentVault to Status Network Sepolia...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const AgentVault = await hre.ethers.getContractFactory("AgentVault");
  const agentVault = await AgentVault.deploy({
    gasPrice: 0,
    gasLimit: 3000000,
  });

  await agentVault.waitForDeployment();

  const address = await agentVault.getAddress();
  console.log("AgentVault deployed to:", address);

  // Save contract address and ABI for the frontend
  const artifact = await hre.artifacts.readArtifact("AgentVault");
  const deploymentInfo = {
    address: address,
    abi: artifact.abi,
    network: "Status Network Sepolia",
    chainId: 1660990954,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Deployment info saved to deployment.json");
  console.log("Explorer:", `https://sepoliascan.status.network/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});