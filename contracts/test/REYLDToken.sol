// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract REYLDToken is ERC20, Pausable, Ownable {

    //Executor
    mapping(address => bool) public executors;

    constructor(address initial) ERC20("REYIELD Token", "REYLD") {
        _mint(initial, 10000000000 * 10 ** decimals());
        _transferOwnership(initial);
    }

    function addExecutor(address _executor) public onlyOwner {
        executors[_executor] = true;
    }

    function removeExecutor(address _executor) public onlyOwner {
        executors[_executor] = false;
    }

    modifier onlyExecutor() {
        require(executors[msg.sender], "Only executor can call this function");
        _;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }

    function burn(uint256 amount) external onlyExecutor {
        _burn(msg.sender, amount);
    }
}
