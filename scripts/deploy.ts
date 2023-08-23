import { ethers } from "hardhat";

async function main() {
  //TODO update the following parameters
  const _governance = "GOVERNANCE_ADDRESS";
  const _officialAccount = "OFFICIAL_ACCOUNT_ADDRESS";
  const _governanceToken = "GOVERNANCE_TOKEN_ADDRESS";
  const _reyieldNFT = "REYIELD_NFT_ADDRESS";
  const _daysTimeLimitedPrivilege = 90;
  const _licenseAmountForPermanentPrivilegeNFT = 3;

  const permission = await ethers.deployContract("ReyieldPermission", [
    _governance,
    _officialAccount,
    _governanceToken,
    _reyieldNFT,
    _daysTimeLimitedPrivilege,
    _licenseAmountForPermanentPrivilegeNFT,
  ]);

  await permission.waitForDeployment();

  console.log(`ReyieldPermission deployed, contract address: ${permission.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
