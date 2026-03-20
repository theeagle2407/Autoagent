require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    statusNetwork: {
      url: "https://public.sepolia.rpc.status.network",
      chainId: 1660990954,
      accounts: ["0x55f98d8672e08e5b6416961cf4aaad44d9a26fa05fa20335af146f3c8fadb79b"],
      gasPrice: 0,
      gas: 3000000,
    },
  },
};