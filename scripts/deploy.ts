import { ethers } from "hardhat";
import hre from "hardhat";

import { REYIELD_NFT, REYLDToken, ReyieldPermission } from "../types";

async function main() {
  const { getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  console.log(`deployer: ${deployer}`);
  const _governance = deployer;
  const _officialAccount = deployer;
  const _governanceToken = "0x3f5AF1473F5d4F73e32F693260AD0e6A645BD0c8";
  const _reyieldNFT = "0x711059DeCDA94200CECdC128Ad38e498225AdC6f";
  const _daysTimeLimitedPrivilege = 90;
  const _licenseAmountForPermanentPrivilegeNFT = 3;

  const permission = (await ethers.deployContract("ReyieldPermission", [
    _governance,
    _officialAccount,
    _daysTimeLimitedPrivilege,
    _licenseAmountForPermanentPrivilegeNFT,
  ])) as unknown as ReyieldPermission;
  await permission.waitForDeployment();
  console.log(`ReyieldPermission deployed, contract address: ${await permission.getAddress()}`);

  await permission.setGovernanceToken(_governanceToken);
  await permission.setReyieldNFT(_reyieldNFT);
  await permission.activateERC20();
  await permission.activateERC721();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
