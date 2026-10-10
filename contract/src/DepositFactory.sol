// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {DepositWallet} from "./DepositWallet.sol";
contract DepositFactory is Ownable {
    address public immutable implementation;
    address public treasury;
    constructor(address _treasury) Ownable(msg.sender) {
        implementation = address(new DepositWallet());
        treasury = _treasury;
    }
    
    function _salt(uint256 userId) internal pure returns (bytes32) {
        return keccak256(abi.encode(userId));
    }
    function predict(uint256 userId) public view returns (address) {
        return
            Clones.predictDeterministicAddress(
                implementation,
                _salt(userId),
                address(this)
            );
    }
    function sweep(uint256 userId, IERC20 token) external onlyOwner {
        address w = predict(userId);
        if (w.code.length == 0) {
            Clones.cloneDeterministic(implementation, _salt(userId));
            DepositWallet(w).init(address(this));
        }
        DepositWallet(w).sweep(token, treasury);
    }
    function setTreasury(address t) external onlyOwner {
        treasury = t;
    }
}
