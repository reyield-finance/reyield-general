// SPDX-License-Identifier: GPL-2.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IReyieldPermission.sol";
import "./interfaces/IERC20Burnable.sol";
import "./interfaces/IERC721Burnable.sol";
import "./interfaces/IERC20Extended.sol";

contract ReyieldPermission is IReyieldPermission, Pausable {
    using SafeERC20 for IERC20;

    uint256 public privilegeStakeAmount;
    bool public isERC20Activated;
    bool public isERC721Activated;

    address public governance;
    address[] public officialAccounts;
    mapping(address => bool) isOfficialAccount;

    address public governanceToken;
    address public reyieldNFT;
    uint256 public immutable daysTimeLimitedPrivilege;
    uint32 public immutable licenseAmountForPermanentPrivilegeNFT;
    mapping(uint32 => uint256) public licenseNoToBurnedTokenAmount;
    mapping(address => PermissionInfo) public userToPermissionInfo;
    mapping(uint256 => bool) public tokenIdToIsPermanent;

    ///@notice emitted when a user burn erc20 tokens to get the right of listing tools
    ///@param user address of user
    ///@param burnedAmount amount of burned governance token
    ///@param licenseAmount license amount of user
    event GovernanceTokenBurned(address indexed user, uint256 burnedAmount, uint32 licenseAmount);

    ///@notice emitted when a user stake erc20 tokens to get the privilege
    ///@param user address of user
    ///@param stakedAmount amount of staked governance token
    event GovernanceTokenStaked(address indexed user, uint256 stakedAmount);

    ///@notice emitted when a user unstake erc20 tokens
    ///@param user address of user
    ///@param unstakedAmount amount of unstaked governance token
    event GovernanceTokenUnstaked(address indexed user, uint256 unstakedAmount);

    ///@notice emitted when a user burn erc721 tokens to get time-limited right of privilege
    ///@param user address of user
    ///@param tokenId tokenId of time-limited NFT
    ///@param expiredAt expired time of time-limited privilege
    event TimeLimitedPrivilegeNFTBurned(address indexed user, uint256 tokenId, uint256 expiredAt);

    ///@notice emitted when a user burn erc721 tokens to get permanent right of privilege & listing tools
    ///@param user address of user
    ///@param tokenId tokenId of permanent NFT
    ///@param licenseAmount license amount of user
    event PermanentPrivilegeNFTBurned(address indexed user, uint256 tokenId, uint32 licenseAmount);

    ///@notice emitted when a official account is added
    ///@param officialAccount address of official account
    event OfficialAccountAdded(address indexed officialAccount);

    ///@notice emitted when a official account is removed
    ///@param officialAccount address of official account
    event OfficialAccountRemoved(address indexed officialAccount);

    modifier onlyGovernance() {
        require(msg.sender == governance, "RPOG");
        _;
    }

    modifier onlyNFTOwner(uint256 tokenId) {
        require(IERC721(reyieldNFT).ownerOf(tokenId) == msg.sender, "RPON");
        _;
    }

    modifier erc20Activated() {
        require(isERC20Activated, "RPERC20A");
        _;
    }

    modifier erc721Activated() {
        require(isERC721Activated, "RPERC721A");
        _;
    }

    constructor(
        address _governance,
        uint256 _daysTimeLimitedPrivilege,
        uint32 _licenseAmountForPermanentPrivilegeNFT
    ) Pausable() {
        require(_governance != address(0), "RPG");

        governance = _governance;
        daysTimeLimitedPrivilege = _daysTimeLimitedPrivilege;
        licenseAmountForPermanentPrivilegeNFT = _licenseAmountForPermanentPrivilegeNFT;
    }

    function pause() external onlyGovernance {
        _pause();
    }

    function unpause() external onlyGovernance {
        _unpause();
    }

    function initPrivilegeStakeAmount(uint8 tokenDecimals) private {
        uint256 decimalMultiplier = 10 ** tokenDecimals;
        privilegeStakeAmount = 138_800 * decimalMultiplier;
    }

    function initLicenseNoToBurnedTokenAmount(uint8 tokenDecimals) private {
        uint256 decimalMultiplier = 10 ** tokenDecimals;
        licenseNoToBurnedTokenAmount[1] = 138_800 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[2] = 185_092 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[3] = 246_824 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[4] = 329_145 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[5] = 438_921 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[6] = 585_310 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[7] = 780_522 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[8] = 1_040_841 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[9] = 1_387_981 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[10] = 1_850_899 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[11] = 2_468_210 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[12] = 3_291_405 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[13] = 4_389_152 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[14] = 5_853_018 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[15] = 7_805_111 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[16] = 10_408_265 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[17] = 13_879_621 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[18] = 18_508_741 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[19] = 24_681_761 * decimalMultiplier;
        licenseNoToBurnedTokenAmount[20] = 32_913_601 * decimalMultiplier;
    }

    function changeGovernance(address _governance) external onlyGovernance {
        require(_governance != address(0), "RPG");
        governance = _governance;
    }

    function addOfficialAccount(address _officialAccount) external onlyGovernance {
        require(_officialAccount != address(0), "RPOA");
        require(!isOfficialAccount[_officialAccount], "RPOAE");

        userToPermissionInfo[_officialAccount].isPermanentPrivilege = true;
        userToPermissionInfo[_officialAccount].licenseAmount = type(uint32).max;
        officialAccounts.push(_officialAccount);
        isOfficialAccount[_officialAccount] = true;
        emit OfficialAccountAdded(_officialAccount);
    }

    function removeOfficialAccount(address _officialAccount) external onlyGovernance {
        require(_officialAccount != address(0), "RPOA");
        require(isOfficialAccount[_officialAccount], "RPOAE");

        userToPermissionInfo[_officialAccount].isPermanentPrivilege = false;
        userToPermissionInfo[_officialAccount].licenseAmount = 0;
        for (uint256 i = 0; i < officialAccounts.length; i++) {
            if (officialAccounts[i] == _officialAccount) {
                officialAccounts[i] = officialAccounts[officialAccounts.length - 1];
                officialAccounts.pop();
                break;
            }
        }
        isOfficialAccount[_officialAccount] = false;
        emit OfficialAccountRemoved(_officialAccount);
    }

    function updatePermanentNFTWhitelist(uint256[] calldata tokenIds) external onlyGovernance erc721Activated {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenIdToIsPermanent[tokenIds[i]] = true;
        }
    }

    function setGovernanceToken(address _governanceToken) external onlyGovernance {
        require(_governanceToken != address(0), "RPGT0");
        governanceToken = _governanceToken;
        initPrivilegeStakeAmount(IERC20Extended(_governanceToken).decimals());
        initLicenseNoToBurnedTokenAmount(IERC20Extended(_governanceToken).decimals());
    }

    function setReyieldNFT(address _reyieldNFT) external onlyGovernance {
        require(_reyieldNFT != address(0), "RPRN0");
        reyieldNFT = _reyieldNFT;
    }

    function activateERC20() external onlyGovernance {
        isERC20Activated = true;
    }

    function deactivateERC20() external onlyGovernance {
        isERC20Activated = false;
    }

    function activateERC721() external onlyGovernance {
        isERC721Activated = true;
    }

    function deactivateERC721() external onlyGovernance {
        isERC721Activated = false;
    }

    function privilege(address user) external view override returns (bool) {
        require(user != address(0), "RPU0");

        PermissionInfo memory permissionInfo = userToPermissionInfo[user];

        uint256 currentTime = block.timestamp;
        return
            permissionInfo.isPermanentPrivilege ||
            permissionInfo.isStakedPrivilege ||
            permissionInfo.privilegeExpiredAt > currentTime;
    }

    function getPermissionInfo(address user) external view returns (PermissionInfo memory) {
        return userToPermissionInfo[user];
    }

    function tryBurnERC20ForLicense(
        address user,
        uint32 licenseAmount
    ) external view returns (uint32 origLicenseAmount, uint32 currentlicenseAmount, uint256 burnedTokenAmount) {
        require(licenseAmount > 0, "RPLA0");
        origLicenseAmount = userToPermissionInfo[user].licenseAmount;

        burnedTokenAmount = _calBurnedAmount(origLicenseAmount, licenseAmount);

        currentlicenseAmount = origLicenseAmount + licenseAmount;
    }

    ///@notice burn erc20 tokens to get the right of listing tools
    ///@param licenseAmount license amount of user
    function burnERC20ForLicense(uint32 licenseAmount) external whenNotPaused erc20Activated {
        require(licenseAmount > 0, "RPLA0");
        PermissionInfo storage permissionInfo = userToPermissionInfo[msg.sender];
        uint32 origLicenseAmount = permissionInfo.licenseAmount;

        uint256 burnedAmount = _calBurnedAmount(origLicenseAmount, licenseAmount);

        ///@dev transfer governance token to this contract
        IERC20(governanceToken).safeTransferFrom(msg.sender, address(this), burnedAmount);

        ///@dev burn governance token
        _burnERC20(governanceToken, burnedAmount);

        //update license amount
        permissionInfo.licenseAmount = origLicenseAmount + licenseAmount;

        emit GovernanceTokenBurned(msg.sender, burnedAmount, permissionInfo.licenseAmount);
    }

    ///@notice stake erc20 tokens to get the privilege
    function stakeERC20ForPrivilege() external whenNotPaused erc20Activated {
        PermissionInfo storage permissionInfo = userToPermissionInfo[msg.sender];
        require(!permissionInfo.isStakedPrivilege, "RPSP");

        ///@dev transfer governance token to this contract
        IERC20(governanceToken).safeTransferFrom(msg.sender, address(this), privilegeStakeAmount);

        //update staked amount
        permissionInfo.stakedAmount = privilegeStakeAmount;

        //update staked time
        permissionInfo.lastStakedAt = block.timestamp;

        //update privilege
        permissionInfo.isStakedPrivilege = true;

        emit GovernanceTokenStaked(msg.sender, permissionInfo.stakedAmount);
    }

    ///@notice unstake erc20 tokens
    function unstakeERC20() external whenNotPaused erc20Activated {
        PermissionInfo storage permissionInfo = userToPermissionInfo[msg.sender];
        require(permissionInfo.stakedAmount > 0, "RPSA0");

        uint256 unstakedAmount = permissionInfo.stakedAmount;

        //transfer governance token to user
        IERC20(governanceToken).safeTransfer(msg.sender, unstakedAmount);

        //update staked amount
        permissionInfo.stakedAmount = permissionInfo.stakedAmount - unstakedAmount;
        //update staked time
        permissionInfo.lastStakedAt = 0;

        //update privilege
        permissionInfo.isStakedPrivilege = false;

        emit GovernanceTokenUnstaked(msg.sender, unstakedAmount);
    }

    function burnERC721(uint256 tokenId) external onlyNFTOwner(tokenId) whenNotPaused erc721Activated {
        bool isPermanent = tokenIdToIsPermanent[tokenId];
        isPermanent
            ? _burnERC721ForPermanentPrivilegeAndLicenses(tokenId)
            : _burnERC721ForTimeLimitedPrivilege(tokenId);
    }

    function tryBurnERC721ForTimeLimitedPrivilege(
        address user
    ) external view returns (uint256 expiredAt, bool isPermanentPrivilege, bool isStakedPrivilege) {
        isPermanentPrivilege = userToPermissionInfo[user].isPermanentPrivilege;

        isStakedPrivilege = userToPermissionInfo[user].isStakedPrivilege;

        if (isPermanentPrivilege || isStakedPrivilege) {
            return (0, isPermanentPrivilege, isStakedPrivilege);
        }

        expiredAt = userToPermissionInfo[user].privilegeExpiredAt;

        uint256 currentBlockTime = block.timestamp;
        if (expiredAt < currentBlockTime) {
            expiredAt = currentBlockTime + (daysTimeLimitedPrivilege * 1 days);
        } else {
            expiredAt = expiredAt + (daysTimeLimitedPrivilege * 1 days);
        }
    }

    ///@notice burn erc721 token to get time-limited right of privilege
    ///@param tokenId tokenId of time-limited NFT
    function _burnERC721ForTimeLimitedPrivilege(uint256 tokenId) internal {
        PermissionInfo storage permissionInfo = userToPermissionInfo[msg.sender];

        require(!permissionInfo.isPermanentPrivilege, "RPPP");

        ///@dev burn time-limited NFT
        _burnERC721(reyieldNFT, tokenId);

        //update time-limited privilege expired time
        uint256 currentBlockTime = block.timestamp;
        if (permissionInfo.privilegeExpiredAt < currentBlockTime) {
            permissionInfo.privilegeExpiredAt = currentBlockTime + (daysTimeLimitedPrivilege * 1 days);
        } else {
            permissionInfo.privilegeExpiredAt = permissionInfo.privilegeExpiredAt + (daysTimeLimitedPrivilege * 1 days);
        }

        emit TimeLimitedPrivilegeNFTBurned(msg.sender, tokenId, permissionInfo.privilegeExpiredAt);
    }

    // burn erc721 token to get permanent right of privilege & listing 3 tools
    function tryBurnERC721ForPermanentPrivilegeAndLicenses(
        address user
    ) external view returns (uint32 origLicenseAmount, uint32 currentlicenseAmount) {
        origLicenseAmount = userToPermissionInfo[user].licenseAmount;
        currentlicenseAmount = origLicenseAmount + licenseAmountForPermanentPrivilegeNFT;
    }

    ///@notice burn erc721 token to get permanent right of privilege & listing tools
    ///@param tokenId tokenId of permanent NFT
    function _burnERC721ForPermanentPrivilegeAndLicenses(uint256 tokenId) internal {
        PermissionInfo storage permissionInfo = userToPermissionInfo[msg.sender];

        require(!permissionInfo.isPermanentPrivilege, "RPPP");

        ///@dev burn permanent NFT
        _burnERC721(reyieldNFT, tokenId);

        //update time-limited privilege expired time & set isPermanentPrivilege to true
        permissionInfo.privilegeExpiredAt = 0;
        permissionInfo.isPermanentPrivilege = true;

        uint32 origLicenseAmount = permissionInfo.licenseAmount;

        //update license amount
        permissionInfo.licenseAmount = origLicenseAmount + licenseAmountForPermanentPrivilegeNFT;

        emit PermanentPrivilegeNFTBurned(msg.sender, tokenId, permissionInfo.licenseAmount);
    }

    function _calBurnedAmount(
        uint32 _origLicenseAmount,
        uint256 _licenseAmount
    ) internal view returns (uint256 burnedAmount) {
        uint32 nextNo = _origLicenseAmount + 1;
        for (uint32 i = nextNo; i < nextNo + _licenseAmount; i++) {
            if (i < 20) {
                burnedAmount = burnedAmount + licenseNoToBurnedTokenAmount[i];
            } else {
                burnedAmount = burnedAmount + licenseNoToBurnedTokenAmount[20];
            }
        }
    }

    function _burnERC20(address tokenAddress, uint256 burnedAmount) internal {
        IERC20Burnable(tokenAddress).burn(burnedAmount);
    }

    function _burnERC721(address nftAddress, uint256 tokenId) internal {
        IERC721Burnable(nftAddress).burn(tokenId);
    }
}
