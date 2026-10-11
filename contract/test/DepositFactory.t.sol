// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test} from "forge-std/Test.sol";
import {DepositFactory} from "../src/DepositFactory.sol";
import {DepositWallet} from "../src/DepositWallet.sol";
contract DepositFactoryTest is Test {
    DepositFactory factory;
    address treasury = makeAddr("treasury");
    address stranger = makeAddr("stranger");
    function setUp() public {
        // this test contract deploys the factory, so it is the owner
        factory = new DepositFactory(treasury);
    }
    function test_predictIsStable() public view {
        assertEq(factory.predict(1), factory.predict(1));
        assertTrue(factory.predict(1) != factory.predict(2));
    }
    function test_sweepEthBeforeDeploy() public {
        address wallet = factory.predict(1);
        vm.deal(wallet, 1 ether); // ETH on an address with no code yet
        assertEq(wallet.code.length, 0);
        factory.sweepETH(1); // deploys the clone and sweeps
        assertEq(treasury.balance, 1 ether);
        assertEq(wallet.balance, 0);
        assertGt(wallet.code.length, 0); // the clone exists now
    }
    function test_walletAcceptsEthAfterDeploy() public {
        factory.sweepETH(1); // only deploys the clone, balance is 0
        address wallet = factory.predict(1);
        vm.deal(address(this), 2 ether);
        (bool ok, ) = wallet.call{value: 1 ether}("");
        assertTrue(ok); // receive() works
        factory.sweepETH(1);
        assertEq(treasury.balance, 1 ether);
    }
    function test_sweepEmitsEvent() public {
        address wallet = factory.predict(1);
        vm.deal(wallet, 1 ether);
        vm.expectEmit(true, false, false, true, wallet);
        emit DepositWallet.Swept(treasury, 1 ether);
        factory.sweepETH(1);
    }
    function test_onlyOwnerCanSweep() public {
        vm.prank(stranger);
        vm.expectRevert();
        factory.sweepETH(1);
    }
    function test_walletRejectsStranger() public {
        factory.sweepETH(1); // deploy the clone
        address wallet = factory.predict(1);
        vm.prank(stranger);
        vm.expectRevert("only factory");
        DepositWallet(payable(wallet)).sweepETH(payable(stranger));
    }
}
