// SPDX-License-Identifier: GPL-2.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IAirdropReward.sol";

contract AirdropReward is IAirdropReward, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public governance;
    address public rewardToken;
    uint256 public startClaimTIme;

    mapping(address => uint256) public userToRewardAmount;
    mapping(address => bool) public userIsClaimed;

    modifier onlyGovernance() {
        require(msg.sender == governance, "AROG");
        _;
    }
    modifier claimStart() {
        require(block.timestamp >= startClaimTIme, "ARCS: Not started yet");
        _;
    }

    constructor(address _governance, address _rewardToken, uint256 _startClaimTIme) Pausable() {
        require(_governance != address(0), "ARGA0");
        require(_rewardToken != address(0), "ARRAA0");
        governance = _governance;
        rewardToken = _rewardToken;
        startClaimTIme = _startClaimTIme;
    }

    function pause() external onlyGovernance {
        _pause();
    }

    function unpause() external onlyGovernance {
        _unpause();
    }

    function changeGovernance(address _governance) external onlyGovernance {
        require(_governance != address(0), "ARG0");
        governance = _governance;
    }

    struct RewardInfo {
        address user;
        uint256 rewardAmount;
    }

    function adminMoveFund(address _token, uint256 _amount) external onlyGovernance {
        IERC20(_token).safeTransfer(governance, _amount);
    }

    function delegateReward(RewardInfo[] memory _rewardWhiteList) external onlyGovernance {
        for (uint256 i = 0; i < _rewardWhiteList.length; i++) {
            userToRewardAmount[_rewardWhiteList[i].user] = _rewardWhiteList[i].rewardAmount;
        }
    }

    function claimReward() external nonReentrant whenNotPaused claimStart {
        //check user has reward or not
        uint256 rewardAmount = userToRewardAmount[msg.sender];
        require(rewardAmount > 0, "ARCR0");

        // check user is claimed or not
        require(!userIsClaimed[msg.sender], "ARCR");

        userIsClaimed[msg.sender] = true;

        IERC20(rewardToken).safeTransfer(msg.sender, rewardAmount);
    }

    function remainingRewardInPool() external view returns (uint256) {
        return IERC20(rewardToken).balanceOf(address(this));
    }

    function setClaimStartTime(uint256 _startClaimTIme) external onlyGovernance {
        startClaimTIme = _startClaimTIme;
    }
}
