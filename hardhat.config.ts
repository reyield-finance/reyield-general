import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";
import "hardhat-deploy";
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
    optimismGoerli: {
      url: process.env.ALCHEMY_OPTIMISM_GOERLI || "",
      accounts: [process.env.TEST_PRIVATE_KEY || ""],
      // gas: 10000000,
      // gasPrice: 1000000000,
    },
    optimism: {
      url: process.env.ALCHEMY_OPTIMISM_MAINNET || "",
      accounts: [process.env.TEST_PRIVATE_KEY || ""],
      // gas: 10000000,
      // gasPrice: 8000000,
    },
  },
  etherscan: {
    apiKey: {
      optimismGoerli: process.env.OPTIMISM_ETHERSCAN_API_KEY || "",
      optimism: process.env.OPTIMISM_ETHERSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "optimismGoerli",
        chainId: 420,
        urls: {
          apiURL: "https://api-goerli-optimism.etherscan.io/api",
          browserURL: "https://goerli-optimism.etherscan.io",
        },
      },
      {
        network: "optimism",
        chainId: 10,
        urls: {
          apiURL: "https://api-optimistic.etherscan.io/api",
          browserURL: "https://optimistic.etherscan.io",
        },
      },
    ],
  },
  mocha: {
    timeout: 20000000000,
    parallel: false,
  },

  namedAccounts: {
    deployer: {
      default: 0,
    },
    multiSig: {
      default: 0,
    },
  },
};

export default config;
