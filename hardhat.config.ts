import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";

require("solidity-coverage");

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yul: true,
            },
          },
        },
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yul: true,
            },
          },
        },
      },
    ],
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: process.env.ALCHEMY_OPTIMISM_MAINNET || "",
        blockNumber: 107735213,
      },
      mining: { auto: true },
    },
    // optimisticEthereum: {
    //   url: process.env.ALCHEMY_OPTIMISM_MAINNET || "",
    //   accounts: [process.env.TEST_PRIVATE_KEY || ""],
    // },
  },
  // etherscan: {
  //   apiKey: {
  //     optimisticEthereum: process.env.OPTIMISM_ETHERSCAN_API_KEY || "",
  //   },
  //   customChains: [
  //     {
  //       network: "optimisticEthereum",
  //       chainId: 10,
  //       urls: {
  //         apiURL: "https://api-optimistic.etherscan.io/api",
  //         browserURL: "https://optimistic.etherscan.io",
  //       },
  //     },
  //   ],
  // },
  mocha: {
    timeout: 20000000000,
    // parallel: true,
  },
};

export default config;
