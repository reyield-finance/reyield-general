import { ethers } from "hardhat";
import hre from "hardhat";
import { get } from "http";

import { REYIELD_NFT, REYLDToken, ReyieldPermission } from "../types";

async function main() {
  const CONFIRMATIONS = 3;
  const { getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  console.log(`deployer: ${deployer}`);
  const _governance = deployer;
  const _daysTimeLimitedPrivilege = 90;
  const _licenseAmountForPermanentPrivilegeNFT = 3;

  const permission = (await ethers.deployContract("ReyieldPermission", [
    _governance,
    _daysTimeLimitedPrivilege,
    _licenseAmountForPermanentPrivilegeNFT,
  ])) as unknown as ReyieldPermission;
  await permission.waitForDeployment();
  console.log(`ReyieldPermission deployed, contract address: ${await permission.getAddress()}`);

  const officialAccountPolygon = "0x5F11887e943D2Ef2B81FBf5D4DB471ed0dc17FD7";
  const officialAccountOP = "0x5F11887e943D2Ef2B81FBf5D4DB471ed0dc17FD7";
  {
    const txResp = await permission.addOfficialAccount(officialAccountPolygon);
    await txResp.wait(CONFIRMATIONS);
  }

  {
    const txResp = await permission.addOfficialAccount(officialAccountOP);
    await txResp.wait(CONFIRMATIONS);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
