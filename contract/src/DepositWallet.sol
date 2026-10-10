// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
contract DepositWallet {
    using SafeERC20 for IERC20;
    address public factory;
    function init(address _factory) external {
        require(factory == address(0), "inited");
        factory = _factory;
    }
    function sweep(IERC20 token, address to) external {
        require(msg.sender == factory, "only factory");
        token.safeTransfer(to, token.balanceOf(address(this)));
    }
}