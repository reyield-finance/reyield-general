import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { REYIELD_NFT, REYLDToken, ReyieldPermission } from "../types";

const baseTokenURI = "https://reyield.fi/api/nfts/";
const THREE_MONTHS_IN_SECS = 90 * 24 * 60 * 60;
const STAKE_AMOUNT_PRIVILEGED = 138_800n * 10n ** 18n;
const BURN_AMOUNT_LICENSE_MAP = new Map<number, bigint>();
BURN_AMOUNT_LICENSE_MAP.set(1, 138_800n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(2, 185_092n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(3, 246_824n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(4, 329_145n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(5, 438_921n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(6, 585_310n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(7, 780_522n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(8, 1_040_841n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(9, 1_387_981n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(10, 1_850_899n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(11, 2_468_210n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(12, 3_291_405n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(13, 4_389_152n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(14, 5_853_018n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(15, 7_805_111n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(16, 10_408_265n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(17, 13_879_621n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(18, 18_508_741n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(19, 24_681_761n * 10n ** 18n);
BURN_AMOUNT_LICENSE_MAP.set(20, 32_913_601n * 10n ** 18n);

describe("REYIELD GENERAL", function () {
  let NFTContract: REYIELD_NFT;
  let REYLDTokenContract: REYLDToken;
  let ReyieldPermissionContract: ReyieldPermission;
  let deployer: HardhatEthersSigner;
  let governance: HardhatEthersSigner;
  let official: HardhatEthersSigner;
  let signers: HardhatEthersSigner[];

  async function deployContracts() {
    [deployer, governance, official, ...signers] = await ethers.getSigners();

    const REYLDFactory = await ethers.getContractFactory("REYLDToken");
    const NftFactory = await ethers.getContractFactory("REYIELD_NFT");
    const ReyieldPermissionFactory = await ethers.getContractFactory("ReyieldPermission");
    NFTContract = (await NftFactory.deploy(baseTokenURI)) as unknown as REYIELD_NFT;
    REYLDTokenContract = (await REYLDFactory.deploy(governance.address)) as unknown as REYLDToken;
    ReyieldPermissionContract = (await ReyieldPermissionFactory.deploy(
      governance.address,
      official.address,
      90,
      3,
    )) as unknown as ReyieldPermission;
    await ReyieldPermissionContract.connect(governance).setGovernanceToken(await REYLDTokenContract.getAddress());
    await ReyieldPermissionContract.connect(governance).setReyieldNFT(await NFTContract.getAddress());
    await ReyieldPermissionContract.connect(governance).activateERC20();
    await ReyieldPermissionContract.connect(governance).activateERC721();
  }

  async function airdropNFTs(numAddressesToAirdrop: number) {
    const addressesToAirdrop = signers.slice(0, numAddressesToAirdrop).map((rest) => rest.address);
    await NFTContract.connect(deployer).airdrop(addressesToAirdrop);
  }

  async function updatePermanentNFTWhitelist(tokenIds: number[]) {
    await ReyieldPermissionContract.connect(governance).updatePermanentNFTWhitelist(tokenIds);
  }

  async function transferERC20(address: HardhatEthersSigner, amount: bigint) {
    await REYLDTokenContract.connect(governance).transfer(address.address, amount);
  }

  beforeEach(async () => {
    await deployContracts();
    await airdropNFTs(10);
    const tokenId1 = 1;
    await updatePermanentNFTWhitelist([tokenId1]);
    await REYLDTokenContract.connect(governance).addExecutor(ReyieldPermissionContract);

    await transferERC20(signers[0], STAKE_AMOUNT_PRIVILEGED);

    await transferERC20(signers[1], STAKE_AMOUNT_PRIVILEGED - 1n);
  });

  describe("Governance", async () => {
    it("Should changeGovernance() success by governance", async () => {
      const newGovernance = signers[2];
      await ReyieldPermissionContract.connect(governance).changeGovernance(newGovernance.address);
      expect(await ReyieldPermissionContract.governance()).to.be.equal(newGovernance.address);
    });

    it("Should changeGovernance() fail by non-governance", async () => {
      const newGovernance = signers[2];
      await expect(
        ReyieldPermissionContract.connect(official).changeGovernance(newGovernance.address),
      ).to.be.revertedWith("RPOG");
    });

    it("Should pause() success by governance", async () => {
      await ReyieldPermissionContract.connect(governance).pause();
      expect(await ReyieldPermissionContract.paused()).to.be.true;
    });

    it("Should unpause() success by governance", async () => {
      await ReyieldPermissionContract.connect(governance).pause();
      expect(await ReyieldPermissionContract.paused()).to.be.true;
      await ReyieldPermissionContract.connect(governance).unpause();
      expect(await ReyieldPermissionContract.paused()).to.be.false;
    });

    it("Should pause() fail by non-governance", async () => {
      await expect(ReyieldPermissionContract.connect(official).pause()).to.be.revertedWith("RPOG");
    });

    it("Should unpause() fail by non-governance", async () => {
      await expect(ReyieldPermissionContract.connect(official).unpause()).to.be.revertedWith("RPOG");
    });
  });

  describe("Update Permanent NFT Whitelist", async () => {
    it("Should updatePermanentNFTWhitelist() with 333 items success by governance", async () => {
      await ReyieldPermissionContract.connect(governance).updatePermanentNFTWhitelist(
        Array(333)
          .fill(0)
          .map((_, i) => i + 1),
      );
      expect(await ReyieldPermissionContract.tokenIdToIsPermanent(0)).to.be.false;
      for (let i = 1; i <= 333; i++) {
        expect(await ReyieldPermissionContract.tokenIdToIsPermanent(i)).to.be.true;
      }
      expect(await ReyieldPermissionContract.tokenIdToIsPermanent(334)).to.be.false;
      expect(await ReyieldPermissionContract.tokenIdToIsPermanent(1000)).to.be.false;
    });
  });

  describe("Official Account", async () => {
    it("Should privilege is true & license is uint32.max", async () => {
      expect(await ReyieldPermissionContract.privilege(official.address)).to.be.true;
      const officialPermissionInfo = await ReyieldPermissionContract.getPermissionInfo(official.address);
      expect(officialPermissionInfo[0]).to.be.true;
      expect(officialPermissionInfo[1]).to.be.false;
      const UINT32_MAX = 4294967295;
      expect(officialPermissionInfo[2]).to.be.equal(UINT32_MAX);
      expect(officialPermissionInfo[3]).to.be.equal(0);
      expect(officialPermissionInfo[4]).to.be.equal(0);
      expect(officialPermissionInfo[5]).to.be.equal(0);
    });

    it("Should changeOfficialAccount() success by governance", async () => {
      const newOfficial = signers[2];
      await ReyieldPermissionContract.connect(governance).changeOfficialAccount(newOfficial.address);
      expect(await ReyieldPermissionContract.officialAccount()).to.be.equal(newOfficial.address);

      const newOfficialPermissionInfo = await ReyieldPermissionContract.getPermissionInfo(newOfficial.address);
      expect(newOfficialPermissionInfo[0]).to.be.true;
      expect(newOfficialPermissionInfo[1]).to.be.false;
      const UINT32_MAX = 4294967295;
      expect(newOfficialPermissionInfo[2]).to.be.equal(UINT32_MAX);
      expect(newOfficialPermissionInfo[3]).to.be.equal(0);
      expect(newOfficialPermissionInfo[4]).to.be.equal(0);
      expect(newOfficialPermissionInfo[5]).to.be.equal(0);

      const oldOfficialPermissionInfo = await ReyieldPermissionContract.getPermissionInfo(official.address);
      expect(oldOfficialPermissionInfo[0]).to.be.false;
      expect(oldOfficialPermissionInfo[1]).to.be.false;
      expect(oldOfficialPermissionInfo[2]).to.be.equal(0);
      expect(oldOfficialPermissionInfo[3]).to.be.equal(0);
      expect(oldOfficialPermissionInfo[4]).to.be.equal(0);
      expect(oldOfficialPermissionInfo[5]).to.be.equal(0);
    });

    it("Should changeOfficialAccount() fail if not governance", async () => {
      const newOfficial = signers[2];
      await expect(
        ReyieldPermissionContract.connect(signers[3]).changeOfficialAccount(newOfficial.address),
      ).to.be.revertedWith("RPOG");
    });

    it("Should fail if official account burn ERC20 because of uint32 overflow", async () => {
      const burnedAmount: bigint = BURN_AMOUNT_LICENSE_MAP.get(1) as bigint;
      const licenseAmount = 1;
      await transferERC20(official, burnedAmount);
      await REYLDTokenContract.connect(official).approve(ReyieldPermissionContract, burnedAmount);
      await expect(
        ReyieldPermissionContract.connect(official).burnERC20ForLicense(licenseAmount),
      ).to.be.revertedWithPanic(17);
      // panic code 0x11 -> 17 (Arithmetic operation underflowed or overflowed outside of an unchecked block)
    });
  });

  describe("NFT Burning", async () => {
    it("Should burnERC721() success if user who has Permanent NFT", async () => {
      const tokenId1 = 1;
      await NFTContract.connect(signers[0]).approve(ReyieldPermissionContract, tokenId1);
      await ReyieldPermissionContract.connect(signers[0]).burnERC721(tokenId1);
      expect(await ReyieldPermissionContract.privilege(signers[0])).to.be.true;
      const signer0PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo[0]).to.be.true;
      expect(signer0PermissionInfo[1]).to.be.false;
      expect(signer0PermissionInfo[2]).to.be.equal(3);
      expect(signer0PermissionInfo[3]).to.be.equal(0);
      expect(signer0PermissionInfo[4]).to.be.equal(0);
      expect(signer0PermissionInfo[5]).to.be.equal(0);
    });

    it("Should burnERC721() success if user who has Temporary NFT", async () => {
      const tokenId2 = 2;
      await NFTContract.connect(signers[1]).approve(ReyieldPermissionContract, tokenId2);
      await ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId2);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
      const signer1PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer1PermissionInfo[0]).to.be.false;
      expect(signer1PermissionInfo[1]).to.be.false;
      expect(signer1PermissionInfo[2]).to.be.equal(0);
      const expiredAt = (await time.latest()) + THREE_MONTHS_IN_SECS;
      expect(signer1PermissionInfo[3]).to.be.equal(expiredAt);
      expect(signer1PermissionInfo[4]).to.be.equal(0);
      expect(signer1PermissionInfo[5]).to.be.equal(0);
    });

    it("Should burnERC721() success if user who has time-limited Privilege and burn Permanent NFT", async () => {
      const tokenId2 = 2;
      await NFTContract.connect(signers[1]).approve(ReyieldPermissionContract, tokenId2);
      await ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId2);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
      const signer1PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer1PermissionInfo[0]).to.be.false;
      expect(signer1PermissionInfo[1]).to.be.false;
      expect(signer1PermissionInfo[2]).to.be.equal(0);
      const expiredAt = (await time.latest()) + THREE_MONTHS_IN_SECS;
      expect(signer1PermissionInfo[3]).to.be.equal(expiredAt);
      expect(signer1PermissionInfo[4]).to.be.equal(0);
      expect(signer1PermissionInfo[5]).to.be.equal(0);

      await NFTContract.connect(deployer).airdrop([signers[1]]);
      const tokenId11 = 11;
      expect(await NFTContract.ownerOf(tokenId11)).to.be.equal(signers[1].address);
      await updatePermanentNFTWhitelist([tokenId11]);
      await NFTContract.connect(signers[1]).approve(ReyieldPermissionContract, tokenId11);
      await ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId11);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;

      const signer1PermissionInfo2 = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer1PermissionInfo2[0]).to.be.true;
      expect(signer1PermissionInfo2[1]).to.be.false;
      expect(signer1PermissionInfo2[2]).to.be.equal(3);
      expect(signer1PermissionInfo2[3]).to.be.equal(0);
      expect(signer1PermissionInfo2[4]).to.be.equal(0);
      expect(signer1PermissionInfo2[5]).to.be.equal(0);
    });

    it("Should burnERC721() fail if contract is paused", async () => {
      const tokenId2 = 2;
      await NFTContract.connect(signers[1]).approve(ReyieldPermissionContract, tokenId2);
      expect(await NFTContract.ownerOf(tokenId2)).to.be.equal(signers[1].address);

      // pause
      await ReyieldPermissionContract.connect(governance).pause();
      await expect(ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId2)).to.be.revertedWith(
        "Pausable: paused",
      );

      // unpause
      await ReyieldPermissionContract.connect(governance).unpause();
      await ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId2);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
    });

    it("Should burnERC721() fail if user who has no NFT", async () => {
      const tokenId3 = 3;
      await expect(ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId3)).to.be.revertedWith("RPON");
    });

    it("Should burnERC721() fail if user who has Permanent want to burn one more NFT", async () => {
      const tokenId1 = 1;
      await NFTContract.connect(signers[0]).approve(ReyieldPermissionContract, tokenId1);
      await ReyieldPermissionContract.connect(signers[0]).burnERC721(tokenId1);
      expect(await ReyieldPermissionContract.privilege(signers[0])).to.be.true;
      const signer0PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo[0]).to.be.true;
      expect(signer0PermissionInfo[1]).to.be.false;
      expect(signer0PermissionInfo[2]).to.be.equal(3);
      expect(signer0PermissionInfo[3]).to.be.equal(0);
      expect(signer0PermissionInfo[4]).to.be.equal(0);
      expect(signer0PermissionInfo[5]).to.be.equal(0);

      const tokenId11 = 11;
      await NFTContract.connect(deployer).airdrop([signers[0]]);
      await updatePermanentNFTWhitelist([tokenId11]);
      await NFTContract.connect(signers[0]).approve(ReyieldPermissionContract, tokenId11);
      await expect(ReyieldPermissionContract.connect(signers[0]).burnERC721(tokenId11)).to.be.revertedWith("RPPP");

      const tokenId12 = 12;
      await NFTContract.connect(deployer).airdrop([signers[0]]);
      await NFTContract.connect(signers[0]).approve(ReyieldPermissionContract, tokenId12);
      await expect(ReyieldPermissionContract.connect(signers[0]).burnERC721(tokenId12)).to.be.revertedWith("RPPP");
    });

    it("Should accumulate expiredAt if user who has temporary privilege burn time-limited NFT again", async () => {
      const tokenId2 = 2;
      await NFTContract.connect(signers[1]).approve(ReyieldPermissionContract, tokenId2);
      await ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId2);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
      const signer1PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer1PermissionInfo[0]).to.be.false;
      expect(signer1PermissionInfo[1]).to.be.false;
      expect(signer1PermissionInfo[2]).to.be.equal(0);
      const now = await time.latest();
      const expiredAt = now + THREE_MONTHS_IN_SECS;
      expect(signer1PermissionInfo[3]).to.be.equal(expiredAt);
      expect(signer1PermissionInfo[4]).to.be.equal(0);
      expect(signer1PermissionInfo[5]).to.be.equal(0);

      const tokenId11 = 11;
      await NFTContract.connect(deployer).airdrop([signers[1]]);
      await NFTContract.connect(signers[1]).approve(ReyieldPermissionContract, tokenId11);
      await ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId11);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
      const signer1PermissionInfo2 = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer1PermissionInfo2[0]).to.be.false;
      expect(signer1PermissionInfo2[1]).to.be.false;
      expect(signer1PermissionInfo2[2]).to.be.equal(0);
      const expiredAt2 = now + THREE_MONTHS_IN_SECS * 2;
      expect(signer1PermissionInfo2[3]).to.be.equal(expiredAt2);
      expect(signer1PermissionInfo2[4]).to.be.equal(0);
      expect(signer1PermissionInfo2[5]).to.be.equal(0);
    });

    it("Should privilege() return false if user's privilege is expired", async () => {
      const tokenId2 = 2;
      await NFTContract.connect(signers[1]).approve(ReyieldPermissionContract, tokenId2);
      await ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId2);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
      const signer1PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer1PermissionInfo[0]).to.be.false;
      expect(signer1PermissionInfo[1]).to.be.false;
      expect(signer1PermissionInfo[2]).to.be.equal(0);
      const now = await time.latest();
      const expiredAt = now + THREE_MONTHS_IN_SECS;
      expect(signer1PermissionInfo[3]).to.be.equal(expiredAt);
      expect(signer1PermissionInfo[4]).to.be.equal(0);
      expect(signer1PermissionInfo[5]).to.be.equal(0);

      await time.increase(THREE_MONTHS_IN_SECS);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.false;
    });

    it("Should privilege() return true if user's privilege is expired and burn time-limited NFT again", async () => {
      const tokenId2 = 2;
      await NFTContract.connect(signers[1]).approve(ReyieldPermissionContract, tokenId2);
      await ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId2);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
      const signer1PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer1PermissionInfo[0]).to.be.false;
      expect(signer1PermissionInfo[1]).to.be.false;
      expect(signer1PermissionInfo[2]).to.be.equal(0);
      const now = await time.latest();
      const expiredAt = now + THREE_MONTHS_IN_SECS;
      expect(signer1PermissionInfo[3]).to.be.equal(expiredAt);
      expect(signer1PermissionInfo[4]).to.be.equal(0);
      expect(signer1PermissionInfo[5]).to.be.equal(0);

      await time.increase(THREE_MONTHS_IN_SECS * 2);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.false;

      const tokenId11 = 11;
      await NFTContract.connect(deployer).airdrop([signers[1]]);
      await NFTContract.connect(signers[1]).approve(ReyieldPermissionContract, tokenId11);
      await ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId11);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
      const signer1PermissionInfo2 = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer1PermissionInfo2[0]).to.be.false;
      expect(signer1PermissionInfo2[1]).to.be.false;
      expect(signer1PermissionInfo2[2]).to.be.equal(0);
      const expiredAt2 = (await time.latest()) + THREE_MONTHS_IN_SECS;
      expect(signer1PermissionInfo2[3]).to.be.equal(expiredAt2);
      expect(signer1PermissionInfo2[4]).to.be.equal(0);
      expect(signer1PermissionInfo2[5]).to.be.equal(0);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
    });
  });

  describe("ERC20 Burning", async () => {
    it("Should burnERC20ForLicense success if user who has 138_888 ERC20", async () => {
      await REYLDTokenContract.connect(signers[0]).approve(ReyieldPermissionContract, STAKE_AMOUNT_PRIVILEGED);
      const licenseAmount = 1;
      const [origLicenseAmount, newLicenseAmount, burnedAmount] =
        await ReyieldPermissionContract.tryBurnERC20ForLicense(signers[0].address, licenseAmount);
      expect(origLicenseAmount).to.be.equal(0);
      expect(newLicenseAmount).to.be.equal(licenseAmount);
      expect(burnedAmount).to.be.equal(BURN_AMOUNT_LICENSE_MAP.get(1) as bigint);
      await ReyieldPermissionContract.connect(signers[0]).burnERC20ForLicense(licenseAmount);
      const signer0PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo[0]).to.be.false;
      expect(signer0PermissionInfo[1]).to.be.false;
      expect(signer0PermissionInfo[2]).to.be.equal(licenseAmount);
      expect(signer0PermissionInfo[3]).to.be.equal(0);
      expect(signer0PermissionInfo[4]).to.be.equal(0);
      expect(signer0PermissionInfo[5]).to.be.equal(0);
    });

    it("Should burnERC20ForLicense success if user who has enough ERC20 token to get 22 license", async () => {
      const licenseAmount = 1;
      const [origLicenseAmount, newLicenseAmount, burnedAmount] =
        await ReyieldPermissionContract.tryBurnERC20ForLicense(signers[0].address, licenseAmount);
      expect(origLicenseAmount).to.be.equal(0);
      expect(newLicenseAmount).to.be.equal(licenseAmount);
      const expectedBurnedAmount: string = BURN_AMOUNT_LICENSE_MAP.get(licenseAmount)?.toString() as string;
      expect(burnedAmount).to.be.equal(expectedBurnedAmount);

      await REYLDTokenContract.connect(signers[0]).approve(ReyieldPermissionContract, STAKE_AMOUNT_PRIVILEGED);
      await ReyieldPermissionContract.connect(signers[0]).burnERC20ForLicense(licenseAmount);
      const signer0PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo[0]).to.be.false;
      expect(signer0PermissionInfo[1]).to.be.false;
      expect(signer0PermissionInfo[2]).to.be.equal(licenseAmount);
      expect(signer0PermissionInfo[3]).to.be.equal(0);
      expect(signer0PermissionInfo[4]).to.be.equal(0);
      expect(signer0PermissionInfo[5]).to.be.equal(0);

      const licenseAmount2 = 22;
      const [origLicenseAmount2, newLicenseAmount2, burnedAmount2] =
        await ReyieldPermissionContract.tryBurnERC20ForLicense(signers[0].address, licenseAmount2);
      expect(origLicenseAmount2).to.be.equal(licenseAmount);
      expect(newLicenseAmount2).to.be.equal(licenseAmount2 + 1);
      let expectedBurnedAmount2: bigint = BigInt(0);
      for (const entry of BURN_AMOUNT_LICENSE_MAP.entries()) {
        if (entry[0] > licenseAmount) {
          expectedBurnedAmount2 += entry[1];
        }
      }
      for (let i = 0; i < licenseAmount2 + 1 - 20; i++) {
        expectedBurnedAmount2 += BURN_AMOUNT_LICENSE_MAP.get(20) as bigint;
      }
      expect(burnedAmount2).to.be.equal(expectedBurnedAmount2);

      await transferERC20(signers[0], expectedBurnedAmount2);
      await REYLDTokenContract.connect(signers[0]).approve(ReyieldPermissionContract, expectedBurnedAmount2);
      await ReyieldPermissionContract.connect(signers[0]).burnERC20ForLicense(licenseAmount2);
      const signer0PermissionInfo2 = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo2[0]).to.be.false;
      expect(signer0PermissionInfo2[1]).to.be.false;
      const expectedNewLicenseAmount2 = licenseAmount2 + 1;
      expect(signer0PermissionInfo2[2]).to.be.equal(expectedNewLicenseAmount2);
      expect(signer0PermissionInfo2[3]).to.be.equal(0);
      expect(signer0PermissionInfo2[4]).to.be.equal(0);
      expect(signer0PermissionInfo2[5]).to.be.equal(0);
    });

    it("Should burnERC20ForLicense() fail if user who hasn't enough ERC20 token", async () => {
      const burnedAmount: string = BURN_AMOUNT_LICENSE_MAP.get(1)?.toString() as string;
      await REYLDTokenContract.connect(signers[1]).approve(ReyieldPermissionContract, burnedAmount);
      await expect(ReyieldPermissionContract.connect(signers[1]).burnERC20ForLicense(1)).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance",
      );
    });

    it("Should burnERC20ForLicense() fail if user who hasn't approve enough ERC20 token", async () => {
      await expect(ReyieldPermissionContract.connect(signers[1]).burnERC20ForLicense(1)).to.be.revertedWith(
        "ERC20: insufficient allowance",
      );
    });
  });

  describe("Permanent NFT + ERC20 Burning", async () => {
    it("Should got 4 privilege if burn 138_800 token then burn Permanent NFT", async () => {
      await REYLDTokenContract.connect(signers[0]).approve(
        ReyieldPermissionContract,
        BURN_AMOUNT_LICENSE_MAP.get(1)?.toString() as string,
      );
      const licenseAmount = 1;
      const [origLicenseAmount, newLicenseAmount, burnedAmount] =
        await ReyieldPermissionContract.tryBurnERC20ForLicense(signers[0].address, licenseAmount);
      expect(origLicenseAmount).to.be.equal(0);
      expect(newLicenseAmount).to.be.equal(licenseAmount);
      expect(burnedAmount).to.be.equal(BURN_AMOUNT_LICENSE_MAP.get(licenseAmount)?.toString());
      await ReyieldPermissionContract.connect(signers[0]).burnERC20ForLicense(licenseAmount);
      const signer0PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo[0]).to.be.false;
      expect(signer0PermissionInfo[1]).to.be.false;
      expect(signer0PermissionInfo[2]).to.be.equal(licenseAmount);
      expect(signer0PermissionInfo[3]).to.be.equal(0);
      expect(signer0PermissionInfo[4]).to.be.equal(0);
      expect(signer0PermissionInfo[5]).to.be.equal(0);

      const tokenId1 = 1;
      await NFTContract.connect(signers[0]).approve(ReyieldPermissionContract, tokenId1);
      await ReyieldPermissionContract.connect(signers[0]).burnERC721(tokenId1);
      expect(await ReyieldPermissionContract.privilege(signers[0])).to.be.true;
      const signer0PermissionInfo2 = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo2[0]).to.be.true;
      expect(signer0PermissionInfo2[1]).to.be.false;
      expect(signer0PermissionInfo2[2]).to.be.equal(4);
      expect(signer0PermissionInfo2[3]).to.be.equal(0);
      expect(signer0PermissionInfo2[4]).to.be.equal(0);
      expect(signer0PermissionInfo2[5]).to.be.equal(0);
    });

    it("Should got 4 privilege if burn Permanent NFT then burn 138_800 token", async () => {
      const tokenId1 = 1;
      await NFTContract.connect(signers[0]).approve(ReyieldPermissionContract, tokenId1);
      await ReyieldPermissionContract.connect(signers[0]).burnERC721(tokenId1);
      expect(await ReyieldPermissionContract.privilege(signers[0])).to.be.true;
      const signer0PermissionInfo2 = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo2[0]).to.be.true;
      expect(signer0PermissionInfo2[1]).to.be.false;
      expect(signer0PermissionInfo2[2]).to.be.equal(3);
      expect(signer0PermissionInfo2[3]).to.be.equal(0);
      expect(signer0PermissionInfo2[4]).to.be.equal(0);
      expect(signer0PermissionInfo2[5]).to.be.equal(0);

      await transferERC20(signers[0], BURN_AMOUNT_LICENSE_MAP.get(4) as bigint);
      await REYLDTokenContract.connect(signers[0]).approve(
        ReyieldPermissionContract,
        BURN_AMOUNT_LICENSE_MAP.get(4)?.toString() as string,
      );
      const licenseAmount = 1;
      const [origLicenseAmount, newLicenseAmount, burnedAmount] =
        await ReyieldPermissionContract.tryBurnERC20ForLicense(signers[0].address, licenseAmount);
      expect(origLicenseAmount).to.be.equal(3);
      expect(newLicenseAmount).to.be.equal(4);
      expect(burnedAmount).to.be.equal(BURN_AMOUNT_LICENSE_MAP.get(4)?.toString() as string);
      await ReyieldPermissionContract.connect(signers[0]).burnERC20ForLicense(licenseAmount);
      const signer0PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo[0]).to.be.true;
      expect(signer0PermissionInfo[1]).to.be.false;
      expect(signer0PermissionInfo[2]).to.be.equal(4);
      expect(signer0PermissionInfo[3]).to.be.equal(0);
      expect(signer0PermissionInfo[4]).to.be.equal(0);
      expect(signer0PermissionInfo[5]).to.be.equal(0);
    });
  });

  describe("Stake & Unstake ERC20", async () => {
    it("Should stakeERC20ForPrivilege() success if user has enough ERC20 token", async () => {
      await REYLDTokenContract.connect(signers[0]).approve(ReyieldPermissionContract, STAKE_AMOUNT_PRIVILEGED);
      await ReyieldPermissionContract.connect(signers[0]).stakeERC20ForPrivilege();
      const now = await time.latest();
      const signer0PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo[0]).to.be.false;
      expect(signer0PermissionInfo[1]).to.be.true;
      expect(signer0PermissionInfo[2]).to.be.equal(0);
      expect(signer0PermissionInfo[3]).to.be.equal(0);
      expect(signer0PermissionInfo[4]).to.be.equal(STAKE_AMOUNT_PRIVILEGED);
      expect(signer0PermissionInfo[5]).to.be.equal(now);
    });

    it("Should stakeERC20ForPrivilege() fail if user has not enough ERC20 token", async () => {
      await REYLDTokenContract.connect(signers[1]).approve(ReyieldPermissionContract, STAKE_AMOUNT_PRIVILEGED);
      await expect(ReyieldPermissionContract.connect(signers[1]).stakeERC20ForPrivilege()).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance",
      );
    });

    it("Should unstakeERC20 success if user has stake", async () => {
      await REYLDTokenContract.connect(signers[0]).approve(ReyieldPermissionContract, STAKE_AMOUNT_PRIVILEGED);
      await ReyieldPermissionContract.connect(signers[0]).stakeERC20ForPrivilege();
      const now = await time.latest();
      const signer0PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo[0]).to.be.false;
      expect(signer0PermissionInfo[1]).to.be.true;
      expect(signer0PermissionInfo[2]).to.be.equal(0);
      expect(signer0PermissionInfo[3]).to.be.equal(0);
      expect(signer0PermissionInfo[4]).to.be.equal(STAKE_AMOUNT_PRIVILEGED);
      expect(signer0PermissionInfo[5]).to.be.equal(now);

      await ReyieldPermissionContract.connect(signers[0]).unstakeERC20();
      const signer0PermissionInfo2 = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo2[0]).to.be.false;
      expect(signer0PermissionInfo2[1]).to.be.false;
      expect(signer0PermissionInfo2[2]).to.be.equal(0);
      expect(signer0PermissionInfo2[3]).to.be.equal(0);
      expect(signer0PermissionInfo2[4]).to.be.equal(0);
      expect(signer0PermissionInfo2[5]).to.be.equal(0);
    });

    it("Should unstakeERC20 fail if user has not stake", async () => {
      await expect(ReyieldPermissionContract.connect(signers[1]).unstakeERC20()).to.be.revertedWith("RPSA0");
    });

    it("Should stakeERC20ForLicense() fail if user has staked", async () => {
      await REYLDTokenContract.connect(signers[0]).approve(ReyieldPermissionContract, STAKE_AMOUNT_PRIVILEGED);
      await ReyieldPermissionContract.connect(signers[0]).stakeERC20ForPrivilege();
      const now = await time.latest();
      const signer0PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo[0]).to.be.false;
      expect(signer0PermissionInfo[1]).to.be.true;
      expect(signer0PermissionInfo[2]).to.be.equal(0);
      expect(signer0PermissionInfo[3]).to.be.equal(0);
      expect(signer0PermissionInfo[4]).to.be.equal(STAKE_AMOUNT_PRIVILEGED);
      expect(signer0PermissionInfo[5]).to.be.equal(now);

      await transferERC20(signers[0], STAKE_AMOUNT_PRIVILEGED);
      await REYLDTokenContract.connect(signers[0]).approve(ReyieldPermissionContract, STAKE_AMOUNT_PRIVILEGED);
      await expect(ReyieldPermissionContract.connect(signers[0]).stakeERC20ForPrivilege()).to.be.revertedWith("RPSP");
    });
  });

  describe("Stake & Unstake ERC20 & burn NFT", async () => {
    it("Should stakeERC20ForLicense() success if user has burned Permanent NFT", async () => {
      const tokenId1 = 1;
      await NFTContract.connect(signers[0]).approve(ReyieldPermissionContract, tokenId1);
      await ReyieldPermissionContract.connect(signers[0]).burnERC721(tokenId1);
      expect(await ReyieldPermissionContract.privilege(signers[0])).to.be.true;
      const signer0PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo[0]).to.be.true;
      expect(signer0PermissionInfo[1]).to.be.false;
      expect(signer0PermissionInfo[2]).to.be.equal(3);
      expect(signer0PermissionInfo[3]).to.be.equal(0);
      expect(signer0PermissionInfo[4]).to.be.equal(0);
      expect(signer0PermissionInfo[5]).to.be.equal(0);
      expect(await ReyieldPermissionContract.privilege(signers[0])).to.be.true;

      await REYLDTokenContract.connect(signers[0]).approve(ReyieldPermissionContract, STAKE_AMOUNT_PRIVILEGED);
      await ReyieldPermissionContract.connect(signers[0]).stakeERC20ForPrivilege();
      const now = await time.latest();
      const signer0PermissionInfo2 = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo2[0]).to.be.true;
      expect(signer0PermissionInfo2[1]).to.be.true;
      expect(signer0PermissionInfo2[2]).to.be.equal(3);
      expect(signer0PermissionInfo2[3]).to.be.equal(0);
      expect(signer0PermissionInfo2[4]).to.be.equal(STAKE_AMOUNT_PRIVILEGED);
      expect(signer0PermissionInfo2[5]).to.be.equal(now);
      expect(await ReyieldPermissionContract.privilege(signers[0])).to.be.true;
    });

    it("Should stakeERC20ForLicense() success if user has burned Time-limited NFT", async () => {
      const tokenId2 = 2;
      await NFTContract.connect(signers[1]).approve(ReyieldPermissionContract, tokenId2);
      await ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId2);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
      const signer1PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer1PermissionInfo[0]).to.be.false;
      expect(signer1PermissionInfo[1]).to.be.false;
      expect(signer1PermissionInfo[2]).to.be.equal(0);
      const expiredAt = (await time.latest()) + THREE_MONTHS_IN_SECS;
      expect(signer1PermissionInfo[3]).to.be.equal(expiredAt);
      expect(signer1PermissionInfo[4]).to.be.equal(0);
      expect(signer1PermissionInfo[5]).to.be.equal(0);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;

      await transferERC20(signers[1], STAKE_AMOUNT_PRIVILEGED);
      await REYLDTokenContract.connect(signers[1]).approve(ReyieldPermissionContract, STAKE_AMOUNT_PRIVILEGED);
      await ReyieldPermissionContract.connect(signers[1]).stakeERC20ForPrivilege();
      const now = await time.latest();
      const signer0PermissionInfo2 = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer0PermissionInfo2[0]).to.be.false;
      expect(signer0PermissionInfo2[1]).to.be.true;
      expect(signer0PermissionInfo2[2]).to.be.equal(0);
      expect(signer0PermissionInfo2[3]).to.be.equal(expiredAt);
      expect(signer0PermissionInfo2[4]).to.be.equal(STAKE_AMOUNT_PRIVILEGED);
      expect(signer0PermissionInfo2[5]).to.be.equal(now);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
    });

    it("Should unstakeERC20 success if user has burned Permanent NFT and stake ERC20", async () => {
      await REYLDTokenContract.connect(signers[0]).approve(ReyieldPermissionContract, STAKE_AMOUNT_PRIVILEGED);
      await ReyieldPermissionContract.connect(signers[0]).stakeERC20ForPrivilege();
      const now = await time.latest();
      const signer0PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo[0]).to.be.false;
      expect(signer0PermissionInfo[1]).to.be.true;
      expect(signer0PermissionInfo[2]).to.be.equal(0);
      expect(signer0PermissionInfo[3]).to.be.equal(0);
      expect(signer0PermissionInfo[4]).to.be.equal(STAKE_AMOUNT_PRIVILEGED);
      expect(signer0PermissionInfo[5]).to.be.equal(now);
      expect(await ReyieldPermissionContract.privilege(signers[0])).to.be.true;

      const tokenId1 = 1;
      await NFTContract.connect(signers[0]).approve(ReyieldPermissionContract, tokenId1);
      await ReyieldPermissionContract.connect(signers[0]).burnERC721(tokenId1);
      expect(await ReyieldPermissionContract.privilege(signers[0])).to.be.true;
      const signer0PermissionInfo2 = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo2[0]).to.be.true;
      expect(signer0PermissionInfo2[1]).to.be.true;
      expect(signer0PermissionInfo2[2]).to.be.equal(3);
      expect(signer0PermissionInfo2[3]).to.be.equal(0);
      expect(signer0PermissionInfo2[4]).to.be.equal(STAKE_AMOUNT_PRIVILEGED);
      expect(signer0PermissionInfo2[5]).to.be.equal(now);
      expect(await ReyieldPermissionContract.privilege(signers[0])).to.be.true;

      await ReyieldPermissionContract.connect(signers[0]).unstakeERC20();
      const signer0PermissionInfo3 = await ReyieldPermissionContract.getPermissionInfo(signers[0]);
      expect(signer0PermissionInfo3[0]).to.be.true;
      expect(signer0PermissionInfo3[1]).to.be.false;
      expect(signer0PermissionInfo3[2]).to.be.equal(3);
      expect(signer0PermissionInfo3[3]).to.be.equal(0);
      expect(signer0PermissionInfo3[4]).to.be.equal(0);
      expect(signer0PermissionInfo3[5]).to.be.equal(0);
      expect(await ReyieldPermissionContract.privilege(signers[0])).to.be.true;
    });

    it("Should unstakeERC20 success if user has burned Time-limited NFT and stake ERC20", async () => {
      await transferERC20(signers[1], STAKE_AMOUNT_PRIVILEGED);
      await REYLDTokenContract.connect(signers[1]).approve(ReyieldPermissionContract, STAKE_AMOUNT_PRIVILEGED);
      await ReyieldPermissionContract.connect(signers[1]).stakeERC20ForPrivilege();
      const now = await time.latest();
      const signer0PermissionInfo2 = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer0PermissionInfo2[0]).to.be.false;
      expect(signer0PermissionInfo2[1]).to.be.true;
      expect(signer0PermissionInfo2[2]).to.be.equal(0);
      expect(signer0PermissionInfo2[3]).to.be.equal(0);
      expect(signer0PermissionInfo2[4]).to.be.equal(STAKE_AMOUNT_PRIVILEGED);
      expect(signer0PermissionInfo2[5]).to.be.equal(now);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;

      const tokenId2 = 2;
      await NFTContract.connect(signers[1]).approve(ReyieldPermissionContract, tokenId2);
      await ReyieldPermissionContract.connect(signers[1]).burnERC721(tokenId2);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
      const signer1PermissionInfo = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer1PermissionInfo[0]).to.be.false;
      expect(signer1PermissionInfo[1]).to.be.true;
      expect(signer1PermissionInfo[2]).to.be.equal(0);
      const expiredAt = (await time.latest()) + THREE_MONTHS_IN_SECS;
      expect(signer1PermissionInfo[3]).to.be.equal(expiredAt);
      expect(signer1PermissionInfo[4]).to.be.equal(STAKE_AMOUNT_PRIVILEGED);
      expect(signer1PermissionInfo[5]).to.be.equal(now);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;

      await ReyieldPermissionContract.connect(signers[1]).unstakeERC20();
      const signer0PermissionInfo3 = await ReyieldPermissionContract.getPermissionInfo(signers[1]);
      expect(signer0PermissionInfo3[0]).to.be.false;
      expect(signer0PermissionInfo3[1]).to.be.false;
      expect(signer0PermissionInfo3[2]).to.be.equal(0);
      expect(signer0PermissionInfo3[3]).to.be.equal(expiredAt);
      expect(signer0PermissionInfo3[4]).to.be.equal(0);
      expect(signer0PermissionInfo3[5]).to.be.equal(0);
      expect(await ReyieldPermissionContract.privilege(signers[1])).to.be.true;
    });
  });

  describe("deactivate erc20", () => {
    it("Should fail after deactivate erc20", async () => {
      let isERC20Activated = await ReyieldPermissionContract.isERC20Activated();
      expect(isERC20Activated).to.be.true;

      await ReyieldPermissionContract.connect(governance).deactivateERC20();

      isERC20Activated = await ReyieldPermissionContract.isERC20Activated();
      expect(isERC20Activated).to.be.false;

      await expect(ReyieldPermissionContract.connect(signers[0]).stakeERC20ForPrivilege()).to.be.revertedWith(
        "RPERC20A",
      );
      await expect(ReyieldPermissionContract.connect(signers[0]).unstakeERC20()).to.be.revertedWith("RPERC20A");
      await expect(ReyieldPermissionContract.connect(signers[0]).burnERC20ForLicense(1)).to.be.revertedWith("RPERC20A");
    });
  });

  describe("deactivate nft", () => {
    it("Should fail after deactivate nft", async () => {
      let isERC721Activated = await ReyieldPermissionContract.isERC721Activated();
      expect(isERC721Activated).to.be.true;

      await ReyieldPermissionContract.connect(governance).deactivateERC721();

      isERC721Activated = await ReyieldPermissionContract.isERC721Activated();
      expect(isERC721Activated).to.be.false;

      await expect(ReyieldPermissionContract.connect(signers[0]).burnERC721(1)).to.be.revertedWith("RPERC721A");
      await expect(ReyieldPermissionContract.connect(governance).updatePermanentNFTWhitelist([1])).to.be.revertedWith(
        "RPERC721A",
      );
    });
  });
});
