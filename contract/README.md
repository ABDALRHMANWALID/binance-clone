## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ cd contract
$ printf '\nPRIVATE_KEY=0x<deployer-private-key>\n' >> .env
$ forge script script/Deploy.s.sol:Deploy --rpc-url sepolia --broadcast
```

The deployer address is set as the treasury. `DepositFactory` creates its
`DepositWallet` implementation in its constructor, so the script prints both
deployed contract addresses. Keep `PRIVATE_KEY` in the ignored local `.env`
file; never commit or share it. The deployer account needs Sepolia ETH for gas.

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
