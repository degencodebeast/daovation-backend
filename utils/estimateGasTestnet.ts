import { utils, constants, BigNumber, getDefaultProvider, Contract, ContractFactory, providers, Wallet } from 'ethers';
import { ethers } from "hardhat";
//import { ethers } from "ethers";
require("dotenv").config();

import { isTestnet, wallet } from "../config/constants";

const { keccak256, defaultAbiCoder } = utils;

const { deployUpgradable, deployContractConstant, deployAndInitContractConstant } = require("@axelar-network/axelar-gmp-sdk-solidity");

const ConstAddressDeployer = require("@axelar-network/axelar-gmp-sdk-solidity/dist/ConstAddressDeployer.json");

const getSaltFromKey = (key: any) => {
    return keccak256(defaultAbiCoder.encode(['string'], [key.toString()]));
};

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

export const estimateGasTestnet = async (contractJson: any, _chain: any, args: any[] = []) => {
    const chain = chains.find((chain: any) => chain.name === _chain);
    const key: any = process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY
    const chainProvider: any = getDefaultProvider(chain?.rpc);

    const connectedWallet = new Wallet(key, chainProvider)

    const deployerFactory = new ContractFactory(
        ConstAddressDeployer.abi,
        ConstAddressDeployer.bytecode,
        connectedWallet,
    );

    const deployer = await deployerFactory.deploy({gasLimit: 5000000});
    await deployer.deployed();

    const salt = getSaltFromKey('');
    const factory = new ContractFactory(contractJson.abi, contractJson.bytecode);
    const bytecode = factory.getDeployTransaction(...args).data;
    return await deployer.estimateGas.deploy(bytecode, salt);
};
