// SPDX-License-Identifier: GPL-2.0
pragma solidity ^0.8.0;

interface IReyieldPermission {
    ///@notice struct of right info
    ///@param isPermanentPrivilege is permanent privilege
    ///@param isStakedPrivilege is staked privilege
    ///@param licenseAmount license amount
    ///@param privilegeExpiredAt privilege expired at
    ///@param stakedAmount staked amount
    ///@param lastStakedAt last staked at
    struct PermissionInfo {
        bool isPermanentPrivilege;
        bool isStakedPrivilege;
        uint32 licenseAmount;
        uint256 privilegeExpiredAt;
        uint256 stakedAmount;
        uint256 lastStakedAt;
    }

    ///@notice check user has privilege
    ///@param user user address
    ///@return true if user has privilege, otherwise false
    function privilege(address user) external view returns (bool);
}
