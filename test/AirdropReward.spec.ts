import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { AirdropReward, REYLDToken } from "../types";

describe("REYIELD AirdropReward", function () {
  let AirdropRewardContract: AirdropReward;
  let REYLDTokenContract: REYLDToken;
  let deployer: HardhatEthersSigner;
  let governance: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let signers: HardhatEthersSigner[];

  async function deployContracts() {
    [deployer, governance, user, user2, ...signers] = await ethers.getSigners();

    const REYLDFactory = await ethers.getContractFactory("REYLDToken");
    REYLDTokenContract = (await REYLDFactory.deploy(governance.address)) as unknown as REYLDToken;

    const latestBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = latestBlock?.timestamp ? latestBlock.timestamp : 0;
    const claimStartTime = currentTimestamp - 100;
    const AirdropRewardFactory = await ethers.getContractFactory("AirdropReward");
    AirdropRewardContract = (await AirdropRewardFactory.deploy(
      governance.address,
      await REYLDTokenContract.getAddress(),
      claimStartTime,
    )) as unknown as AirdropReward;
  }

  async function delegateUserReward() {
    await AirdropRewardContract.connect(governance).delegateReward([
      { user: user.address, rewardAmount: 1000n },
      { user: user2.address, rewardAmount: 2000n },
    ]);
  }

  beforeEach(async () => {
    await deployContracts();
    await REYLDTokenContract.connect(governance).transfer(await AirdropRewardContract.getAddress(), 10000n);
  });

  describe("Governance", async () => {
    it("Should changeGovernance() success by governance", async () => {
      const newGovernance = signers[2];
      await AirdropRewardContract.connect(governance).changeGovernance(newGovernance.address);
      expect(await AirdropRewardContract.governance()).to.be.equal(newGovernance.address);
    });

    it("Should changeGovernance() fail by non-governance", async () => {
      const newGovernance = signers[2];
      await expect(AirdropRewardContract.connect(user).changeGovernance(newGovernance.address)).to.be.revertedWith(
        "AROG",
      );
    });

    it("Should pause() success by governance", async () => {
      await AirdropRewardContract.connect(governance).pause();
      expect(await AirdropRewardContract.paused()).to.be.true;
    });

    it("Should unpause() success by governance", async () => {
      await AirdropRewardContract.connect(governance).pause();
      expect(await AirdropRewardContract.paused()).to.be.true;
      await AirdropRewardContract.connect(governance).unpause();
      expect(await AirdropRewardContract.paused()).to.be.false;
    });

    it("Should pause() fail by non-governance", async () => {
      await expect(AirdropRewardContract.connect(user).pause()).to.be.revertedWith("AROG");
    });

    it("Should unpause() fail by non-governance", async () => {
      await expect(AirdropRewardContract.connect(user).unpause()).to.be.revertedWith("AROG");
    });
  });

  describe("claimReward()", async () => {
    it("Should claimReward() success", async () => {
      await delegateUserReward();
      expect(await AirdropRewardContract.userIsClaimed(user.address)).to.be.false;
      expect(await AirdropRewardContract.userToRewardAmount(user.address)).to.be.equal(1000n);
      expect(await AirdropRewardContract.remainingRewardInPool()).to.be.equal(10000n);
      await AirdropRewardContract.connect(user).claimReward();
      expect(await AirdropRewardContract.userIsClaimed(user.address)).to.be.true;
      expect(await AirdropRewardContract.remainingRewardInPool()).to.be.equal(9000n);

      expect(await AirdropRewardContract.userIsClaimed(user2.address)).to.be.false;
      expect(await AirdropRewardContract.userToRewardAmount(user2.address)).to.be.equal(2000n);
      expect(await AirdropRewardContract.remainingRewardInPool()).to.be.equal(9000n);
      await AirdropRewardContract.connect(user2).claimReward();
      expect(await AirdropRewardContract.userIsClaimed(user2.address)).to.be.true;
      expect(await AirdropRewardContract.remainingRewardInPool()).to.be.equal(7000n);
    });

    it("Should claimReward() fail if paused", async () => {
      await AirdropRewardContract.connect(governance).pause();
      await delegateUserReward();
      await expect(AirdropRewardContract.connect(user).claimReward()).to.be.revertedWith("Pausable: paused");
    });

    it("Should claimReward() fail if already claimed", async () => {
      await delegateUserReward();
      await AirdropRewardContract.connect(user).claimReward();
      await expect(AirdropRewardContract.connect(user).claimReward()).to.be.revertedWith("ARCR");
    });

    it("Should claimReward() fail if not delegated", async () => {
      await expect(AirdropRewardContract.connect(user).claimReward()).to.be.revertedWith("ARCR0");
    });

    it("Should claimReward() fail claim not start", async () => {
      const latestBlock = await ethers.provider.getBlock("latest");
      const currentTimestamp = latestBlock?.timestamp ? latestBlock.timestamp : 0;
      const claimStartTime = currentTimestamp + 100000;
      await AirdropRewardContract.connect(governance).setClaimStartTime(claimStartTime);
      await delegateUserReward();
      await expect(AirdropRewardContract.connect(user).claimReward()).to.be.revertedWith("ARCS: Not started yet");
    });
  });

  describe("adminMoveFund()", async () => {
    it("Should adminMoveFund() success", async () => {
      await AirdropRewardContract.connect(governance).adminMoveFund(await REYLDTokenContract.getAddress(), 1000n);
      expect(await AirdropRewardContract.remainingRewardInPool()).to.be.equal(9000n);
    });

    it("Should adminMoveFund() success even if paused", async () => {
      await AirdropRewardContract.connect(governance).pause();
      await AirdropRewardContract.connect(governance).adminMoveFund(await REYLDTokenContract.getAddress(), 1000n);
      expect(await AirdropRewardContract.remainingRewardInPool()).to.be.equal(9000n);
    });
  });
});
