
 // SPDX-License-Identifier: MIT
 pragma solidity ^0.8.24;

 import {Script, console} from "forge-std/Script.sol";
 import {DepositFactory} from "../src/DepositFactory.sol";

 contract Deploy is Script {
     function run() external {
         uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
         address treasury = vm.addr(deployerPrivateKey);

         vm.startBroadcast(deployerPrivateKey);

         DepositFactory factory = new DepositFactory(treasury);

         vm.stopBroadcast();

         console.log("Factory:", address(factory));
         console.log("Wallet implementation:", factory.implementation());
         console.log("Treasury:", treasury);
     }
 }
