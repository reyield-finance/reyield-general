import { ethers } from "hardhat";
import hre from "hardhat";

import { AirdropReward } from "../types";

async function main() {
  const { getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  console.log(`deployer: ${deployer}`);
  const _governance = deployer;
  const createTime = Math.trunc(Date.now() / 1000 + 24 * 60 * 60);
  console.log(`createTime: ${createTime}`);
  const airdropReward = (await ethers.deployContract("AirdropReward", [
    _governance,
    "0x3f5AF1473F5d4F73e32F693260AD0e6A645BD0c8",
    createTime,
  ])) as unknown as AirdropReward;
  await airdropReward.waitForDeployment();
  console.log(`AirdropReward deployed, contract address: ${await airdropReward.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
