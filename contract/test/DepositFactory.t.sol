// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DepositFactory} from "../src/DepositFactory.sol";

contract DepositFactoryTest is Test {
    function testConstructor() public {
        address treasury = makeAddr("treasury");

        DepositFactory factory = new DepositFactory(treasury);

        assertEq(factory.treasury(), treasury);
        assertEq(factory.owner(), address(this));
        assertTrue(factory.implementation().code.length > 0);
    }
}