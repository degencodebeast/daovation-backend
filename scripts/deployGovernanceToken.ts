import { utils, constants, BigNumber, getDefaultProvider, ContractFactory, providers, Wallet } from 'ethers';
import { ethers } from "ethers";
import fs from "fs/promises";
//import { estimateGasTestnet } from "../utils/estimateGasTestnet"
const { defaultAbiCoder, keccak256 } = utils;
const { deployUpgradable } = require("@axelar-network/axelar-gmp-sdk-solidity");
const { utils: {
    deployContract
} } = require("@axelar-network/axelar-local-dev");
require("dotenv").config();
//import * as GovernanceToken from "../artifacts/contracts/GovernanceToken.sol/GovernanceToken.json" ;
const GovernanceToken = require("../artifacts/contracts/GovernanceToken.sol/GovernanceToken.json");
const ExampleProxy = require("../artifacts/contracts/ExampleProxy.sol/ExampleProxy.json");
//import * as ExampleProxy from "../artifacts/contracts/ExampleProxy.sol/ExampleProxy.json";
import { isTestnet, wallet } from "../config/constants";


const ConstAddressDeployer = require("@axelar-network/axelar-gmp-sdk-solidity/dist/ConstAddressDeployer.json");

const getSaltFromKey = (key: any) => {
    return keccak256(defaultAbiCoder.encode(['string'], [key.toString()]));
};


const name = 'KingToken';
const symbol = 'KT';
const decimals = 13;

let GovernanceTokenAddr = "0xD7F2bbC67cBC880F8f7C99d9F24dE7bBe3243C4C";

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

const chainNames2 = ["Aurora", "Fantom","Polygon"];

const chainsInfo: any = [];


async function deploy(chain: any, wallet: any, _gasLimit: any) {
    console.log(`Deploying Governance Token for ${chain.name}.`);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);
    const contract = await deployUpgradable(
        chain.constAddressDeployer,
        connectedWallet,
        GovernanceToken,
        ExampleProxy,
        [chain.gateway, chain.gasReceiver],
        [],
        defaultAbiCoder.encode(['string'], [chain.name]),
        'goptyqilltosss',
        _gasLimit
    );
    chain.contract = contract;
    console.log(`Deployed Governance Token for ${chain.name} at ${chain.contract.address}`);
}

// async function estimateGas(contractJson: any, chain: any) {
//     console.log(`Estimating Gas for ${chain.name} deployment.`);
//     const provider = getDefaultProvider(chain.rpc);

//     const gas = await estimateGasTestnet(contractJson, chain, [
//         chain.gateway, chain.gasReceiver]);
//     console.log(`Gas for this contract deploy for ${chain.name} is ${gas}`);
//     return gas;
// }

async function main() {
    //let cnIndex = 0;
    //const promises = [];

    for (let i = 0; i < chainNames2.length; i++) {
        let chainName = chainNames2[i];
        //let chainInfo = chainsInfo[i];
        let chainInfo = chains.find((chain: any) => {
            if (chain.name === chainName) {
                chainsInfo.push(chain);
                return chain;
            }
        });

        console.log(`Deploying [${chainName}]`);
        //promises.push(deploy(chainInfo, wallet));

        const estimatedGas: any = await estimateGas(GovernanceToken, chainInfo, wallet);
        const bufferGas: any = BigInt(Math.floor(estimatedGas * 1.7))

        const bigNumber = ethers.BigNumber.from(bufferGas);
        const jsGasLimit = bigNumber.toNumber();
        console.log(jsGasLimit)

        await deploy(chainInfo, wallet, jsGasLimit);
        // cnIndex += 1;
    }

    // const result = await Promise.all(promises);
    //  return result;

    // Promise.all(promises).then((values) => {
    //     return values;
    // })

}



async function estimateGas(contractJson: any, chain: any, wallet: any) {
    console.log(`Estimating Gas for ${chain.name} deployment.`);
    const provider = getDefaultProvider(chain.rpc);
    //const connectedWallet = wallet.connect(provider);

    // const gas = await estimateGasForDeploy(contractJson, [hubChain, DAOAddress,
    //     chain.gateway, chain.gasReceiver, governanceToken, targetSecondsPerBlock]);
    // console.log(`Gas for this contract deploy for ${chain.name} is ${gas}`);
    // return gas;

    const gas = await estimateGasTestnet(contractJson, chain, wallet, [chain.gateway, chain.gasReceiver]);
    console.log(`Gas for this contract deploy for ${chain.name} is ${gas}`);
    return gas;

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

    const deployer = await deployerFactory.deploy({gasLimit: 7000000});
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































// async function deploy2(chain: any, wallet:any) {
//     console.log(`Deploying Governance Token for ${chain.name}.`);
//     const provider = getDefaultProvider(chain.rpc);
//     chain.wallet = wallet.connect(provider);
//     const sender = await deployContract(wallet, GovernanceToken, [chain.gateway, chain.gasService],);

//     console.log(`MessageSender deployed on ${
//         chain.name
//     }:`, sender.address);
//     chain.messageSender = sender.address;
// }

// async function execute(chains: any, wallet: any, options: any) {
//     const args = options.args || [];
//     const { source, destination, calculateBridgeFee } = options;
//     const amount = parseInt(args[2]) || 1e5;

//     async function print() {
//         console.log(`Balance at ${source.name} is ${await source.contract.balanceOf(wallet.address)}`);
//         console.log(`Balance at ${destination.name} is ${await destination.contract.balanceOf(wallet.address)}`);
//     }

//     const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

//     const initialBalance = await destination.contract.balanceOf(wallet.address);
//     console.log('--- Initially ---');
//     await print();

//     const fee = await calculateBridgeFee(source, destination);
//     await (await source.contract.giveMe(amount)).wait();
//     console.log('--- After getting some token on the source chain ---');
//     await print();

//     await (
//         await source.contract.transferRemote(destination.name, wallet.address, amount, {
//             value: fee,
//         })
//     ).wait();

//     while (true) {
//         const updatedBalance = await destination.contract.balanceOf(wallet.address);
//         if (updatedBalance.gt(initialBalance)) break;
//         await sleep(2000);
//     }

//     console.log('--- After ---');
//     await print();


// }