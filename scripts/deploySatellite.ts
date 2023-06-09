import { utils, constants, BigNumber, getDefaultProvider, Contract, ContractFactory, providers, Wallet } from 'ethers';
import { ethers } from "hardhat";
//import { ethers } from "ethers";
require("dotenv").config();

import fs from "fs/promises";
import { CrossChainDAO, CrossChainDAO__factory, DAOSatellite__factory, GovernanceToken, GovernanceToken__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

const { keccak256, defaultAbiCoder } = utils;
const { Web3Provider } = providers;

const { deployUpgradable, deployContractConstant, deployAndInitContractConstant } = require("@axelar-network/axelar-gmp-sdk-solidity");
const { estimateGasForDeploy } = require("@axelar-network/axelar-gmp-sdk-solidity");

const ConstAddressDeployer = require("@axelar-network/axelar-gmp-sdk-solidity/dist/ConstAddressDeployer.json");

const getSaltFromKey = (key: any) => {
    return keccak256(defaultAbiCoder.encode(['string'], [key.toString()]));
};

const { utils: {
    deployContract
} } = require("@axelar-network/axelar-local-dev");

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

let targetSecondsPerBlockObj = require("../config/targetSecondsPerBlock.json");

//let moonBeamSatelliteAddr 

const spokeChainNames = ["Fantom", "Avalanche"];
const daoSatellite = require("../artifacts/contracts/DAOSatellite.sol/DAOSatellite.json");
const ExampleProxy = require("../artifacts/contracts/ExampleProxy.sol/ExampleProxy.json");

let chainsInfo: any = [];

let hubChain = "Polygon";

let governanceTokenAddr = "0x22eA0B5104cfa244960cF1957E60Adc2B3aC9047";
let DAOAddress = "0x5d58EaF49B52A8Bf4C07B7D3517aB7BC04844D5e";
let satelliteAddr = "0xD69E106223f50C6FCDD5B74Ba8c1bD0929cDf4fd";


// removed rpc for avax
//"rpc": "https://api.avax-test.network/ext/bc/C/rpc",


//let spokeChain = "Moonbeam";


async function deploy(_hubChain: string, _hubChainAddr: string, chain: any, wallet: any, governanceToken: string, targetSecondsPerBlock: number, _gasLimit: any) {
    console.log(`Deploying Satellite for ${chain.name}.`);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);
    //const myGasLimit = BigNumber.from(_gasLimit);
    //const gasPriceWei = ethers.utils.parseUnits(_gasLimit.toString(), 'wei');
    const myGasLimit2 = _gasLimit;
    //const options = { 800000 };

    //removed one
    //"rpc": "https://rpc.ankr.com/avalanche_fuji",

    const contract = await deployUpgradable(
        chain.constAddressDeployer,
        connectedWallet,
        daoSatellite,
        ExampleProxy,
        [_hubChain, _hubChainAddr, chain.gateway, chain.gasReceiver, governanceToken, targetSecondsPerBlock],
        [],
        //defaultAbiCoder.encode(['string'], [chain.name]),
        defaultAbiCoder.encode(['string'], [chain.name]),
        'SaltAgainBroBroBro',
        myGasLimit2
    );
    // chain.contract = contract;
    // console.log(`Deployed Satellite for ${chain.name} at ${chain.contract.address}`);

    console.log(`The contract address deployer for  ${chain.name} is ${chain.constAddressDeployer}`)
    console.log(`Deployed Satellite for ${chain.name} at ${contract.address}`);
}

async function deployConstant(_hubChain: string, _hubChainAddr: string, chain: any, wallet: any, governanceToken: string, targetSecondsPerBlock: number, _gasLimit: any) {
    console.log(`Deploying Satellite for ${chain.name}.`);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);
    //const myGasLimit = BigNumber.from(_gasLimit);
    //const gasPriceWei = ethers.utils.parseUnits(_gasLimit.toString(), 'wei');
    const myGasLimit2 = _gasLimit;
    //const options = { 800000 };

    const contract = await deployContractConstant(
        chain.constAddressDeployer,
        connectedWallet,
        daoSatellite,
        '123Satelliteees',
        [_hubChain, _hubChainAddr, chain.gateway, chain.gasReceiver, governanceToken, targetSecondsPerBlock],
        //defaultAbiCoder.encode(['string'], [chain.name]),
        myGasLimit2
    );
    // chain.contract = contract;
    // console.log(`Deployed Satellite for ${chain.name} at ${chain.contract.address}`);
    //chain.contract = contract;
    console.log(`The contract address deployer for  ${chain.name} is ${chain.constAddressDeployer}`)
    console.log(`Deployed Satellite for ${chain.name} at ${contract.address}`);
}

async function deployAndInitConstant(_hubChain: string, _hubChainAddr: string, chain: any, wallet: any, governanceToken: string, targetSecondsPerBlock: number, _gasLimit: any) {
    console.log(`Deploying Satellite for ${chain.name}.`);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);
    //const myGasLimit = BigNumber.from(_gasLimit);
    //const gasPriceWei = ethers.utils.parseUnits(_gasLimit.toString(), 'wei');
    const myGasLimit2 = _gasLimit;
    //const options = { 800000 };

    const contract = await deployAndInitContractConstant(
        chain.constAddressDeployer,
        connectedWallet,
        daoSatellite,
        'daosatellites',
        [_hubChain, _hubChainAddr, chain.gateway, chain.gasReceiver, governanceToken, targetSecondsPerBlock],
        [],
        //defaultAbiCoder.encode(['string'], [chain.name]),
        myGasLimit2
    );
    chain.contract = contract;
    console.log(`Deployed Satellite for ${chain.name} at ${chain.contract.address}`);
}

let targetSecond: any;

async function main() {
    const promises = [];

    for (let i = 0; i < spokeChainNames.length; i++) {

        let chainName = spokeChainNames[i];

        let chainInfo = chains.find((chain: any) => {
            if (chain.name === chainName) {
                chainsInfo.push(chain);
                return chain;
            }
        });

        for (const property in targetSecondsPerBlockObj) {
            if (chainName === property) {
                targetSecond = targetSecondsPerBlockObj[property]
            }
        }

        console.log(`Deploying [${chainName}]`);

        //console.log(`Estimating [${chainName}]`)
        // const bufferPercentage = 30;
        //const estimatedGas: any = await estimateGas(daoSatellite, hubChain, DAOAddress, chainInfo, wallet, governanceTokenAddr, targetSecond);

        const estimatedGas: any = await estimateGas(daoSatellite, hubChain, DAOAddress, chainInfo, wallet, governanceTokenAddr, targetSecond);
        const bufferGas: any = BigInt(Math.floor(estimatedGas * 1.6))

        // //const bufferGas = Math.ceil(estimatedGas.toNumber() * (bufferPercentage / 100));
        // const bufferGas: any = BigInt(Math.floor(estimatedGas * 1.3))
        // //const gasLimit = estimatedGas.add(bufferGas);
        // //const bigNumber = ethers.BigNumber.from(gasLimit);

        const bigNumber = ethers.BigNumber.from(bufferGas);
        const jsGasLimit = bigNumber.toNumber();
        console.log(jsGasLimit)

        await deploy(hubChain, DAOAddress, chainInfo, wallet, governanceTokenAddr, targetSecond, jsGasLimit);
        //await deployConstant(hubChain, DAOAddress, chainInfo, wallet, governanceTokenAddr, targetSecond, jsGasLimit)
        //await deployAndInitConstant(hubChain, DAOAddress, chainInfo, wallet, governanceTokenAddr, targetSecond, bufferGas)
    }

    //await interact(spokeChain, wallet, satelliteAddr)

}

async function interact(_spokeChain: string, wallet: any, satelliteAddr: string) {
    const chain = chains.find((chain: any) => chain.name === _spokeChain);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);

    const daoSatelliteFactory = new DAOSatellite__factory(connectedWallet);
    const daoSatelliteInstance = daoSatelliteFactory.attach(satelliteAddr);

    const result = await daoSatelliteInstance.targetSecondsPerBlock();
    console.log(`The targetsecondsPerblock for spokechain ${_spokeChain} is ${result}`)
    //const result2 = await governanceTokenInstance.spokeChainNames(0);
    //console.log(result);

}

async function estimateGas(contractJson: any, _hubChain: string, _hubChainAddr: string, chain: any, wallet: any, governanceToken: string, targetSecondsPerBlock: number) {
    console.log(`Estimating Gas for ${chain.name} deployment.`);
    const provider = getDefaultProvider(chain.rpc);
    //const connectedWallet = wallet.connect(provider);

    const gas = await estimateGasForDeploy(contractJson, [hubChain, DAOAddress,
        chain.gateway, chain.gasReceiver, governanceToken, targetSecondsPerBlock]);
    console.log(`Gas for this contract deploy for ${chain.name} is ${gas}`);
    return gas;

    // const gas = await estimateGasTestnet(contractJson, chain, wallet, [hubChain, DAOAddress,
    // chain.gateway, chain.gasReceiver, governanceToken, targetSecondsPerBlock]);
    // console.log(`Gas for this contract deploy for ${chain.name} is ${gas}`);
    // return gas;

}

const estimateGasTestnet = async (contractJson: any, chain: any, _wallet: any, args: any[] = []) => {
    //const key: any = keccak256(0);
    const key: any = process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY
    const chainProvider: any = getDefaultProvider(chain.rpc);

    //const provider = new Web3Provider(chainProvider);
    //const wallet = new Wallet(key, provider);
    //const wallet = _wallet.connect(provider);
    const connectedWallet = new Wallet(key, chainProvider)

    const deployerFactory = new ContractFactory(
        ConstAddressDeployer.abi,
        ConstAddressDeployer.bytecode,
        connectedWallet,
    );

    const deployer = await deployerFactory.deploy();
    await deployer.deployed();

    const salt = getSaltFromKey('');
    const factory = new ContractFactory(contractJson.abi, contractJson.bytecode);
    const bytecode = factory.getDeployTransaction(...args).data;
    return await deployer.estimateGas.deploy(bytecode, salt);
};


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});


