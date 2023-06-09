import { utils, constants, BigNumber, getDefaultProvider, Wallet, ContractFactory, Contract } from 'ethers';
import { ethers } from "hardhat";
//import { ethers } from "ethers";
require("dotenv").config();


import fs from "fs/promises";
import { CrossChainDAO, CrossChainDAO__factory, GovernanceToken, GovernanceToken__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

const ConstAddressDeployer = require("@axelar-network/axelar-gmp-sdk-solidity/dist/ConstAddressDeployer.json");
const { estimateGasForDeploy, deployContractConstant } = require("@axelar-network/axelar-gmp-sdk-solidity/scripts/constAddressDeployer");

const crossChainDAOJson = require("../artifacts/contracts/CrossChainDAO.sol/CrossChainDAO.json");

const { defaultAbiCoder, keccak256 } = utils;

const getSaltFromKey = (key: any) => {
    return keccak256(defaultAbiCoder.encode(['string'], [key.toString()]));
};


const { deployUpgradable } = require("@axelar-network/axelar-gmp-sdk-solidity");
// const { utils: {
//     deployContract
// } } = require("@axelar-network/axelar-gmp-sdk-solidity");

const { deployContract } = require("@axelar-network/axelar-gmp-sdk-solidity/scripts/utils");

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

let GovernanceTokenAddr = "0x22eA0B5104cfa244960cF1957E60Adc2B3aC9047";
const PolygonDAOAddr = "0x5d58EaF49B52A8Bf4C07B7D3517aB7BC04844D5e"

//const spokeChainNames = ["Moonbeam", "Avalanche", "Ethereum", "Fantom", "Polygon"];

const spokeChainNames = ["Fantom", "Avalanche"];
const spokeChainIds: any = [];

const HubChain = "Polygon";
//const satellitedAddr: any = "";

let encodedSpokeChainIds: any;
let encodedSpokeChainNames: any;

function getChainIds(chains: any) {
    for (let i = 0; i < spokeChainNames.length; i++) {
        let chainName = spokeChainNames[i];
        //let chainInfo = chainsInfo[i];
        chains.find((chain: any) => {
            if (chain.name === chainName) {
                spokeChainIds.push(chain.chainId);

            }
        });
    }
}


export async function main() {
    getChainIds(chains);
    console.log(spokeChainIds)
    encodedSpokeChainIds = ethers.utils.defaultAbiCoder.encode(
        ["uint32[]"],
        [spokeChainIds]
    );
    encodedSpokeChainNames = ethers.utils.defaultAbiCoder.encode(
        ["string[]"],
        [spokeChainNames]
    );

    // const estimatedGas: any = await estimateGas(crossChainDAOJson, HubChain,GovernanceTokenAddr/*, wallet*/);
    // const bufferedGas: any = BigInt(Math.floor(estimatedGas * 1.7)) //if this doesn't work, maybe you can switch to math ceil

    // const bigNumber = ethers.BigNumber.from(bufferedGas);
    // const jsGasLimit = bigNumber.toNumber();
    // console.log(jsGasLimit)

    await crossChainDAODeploy(HubChain, wallet, GovernanceTokenAddr/*, jsGasLimit*/);
    //await deployConstant(HubChain, wallet, GovernanceTokenAddr, jsGasLimit);
    //await interact("Moonbeam", wallet, BinanceDAOAddr);

}

async function crossChainDAODeploy(hubChain: any, wallet: any, governanceToken: string/*, _gasLimit: any*/) {
    const chain = chains.find((chain: any) => chain.name === hubChain);

    console.log(`Deploying CrossChainDAO for ${chain.name}.`);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);

    //const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
    const crossChainDAOFactory = new ethers.ContractFactory(crossChainDAOJson.abi, crossChainDAOJson.bytecode, connectedWallet);
    

    const constructorArgs = [
        // Pass your constructor arguments here
        governanceToken,
             chain.gateway,
             chain.gasReceiver,
            encodedSpokeChainIds,
            encodedSpokeChainNames
      ];


    // const transactionData = crossChainDAOFactory.getDeployTransaction(...constructorArgs);
    // const gasLimit = transactionData.gasLimit

    //console.log(estimatedGas.toNumber())

    //Estimate the gas required for deployment
    // const transactionData = crossChainDAOFactory.getDeployTransaction(
    //     governanceToken,
    //     chain.gateway,
    //     chain.gasReceiver,
    //     encodedSpokeChainIds,
    //     encodedSpokeChainNames);

    // console.log("Estimating gas...")
    // const gasEstimate: any = await provider.estimateGas(transactionData);
    // //const gasEstimate: any = await provider.estimateGas({ ...transactionData, gasLimit: 800000 });

    // console.log('Estimated gas:', gasEstimate.toString());

    // const bufferedGas: any = BigInt(Math.floor(gasEstimate * 1.2))
    // const bigNumber = ethers.BigNumber.from(bufferedGas);
    // const jsGasLimit = bigNumber.toNumber();
    // console.log(jsGasLimit)

    const contract = await crossChainDAOFactory.deploy(
        governanceToken,
        chain.gateway,
        chain.gasReceiver,
        encodedSpokeChainIds,
        encodedSpokeChainNames,
        {gasLimit: 4000000}
       // {gasLimit: bigNumber}
    );

    const options = {
        gasLimit: 5000000
        //gasLimit: _gasLimit,
        //gasPrice: ethers.utils.parseUnits('30', 'gwei'), // Setting gas price to 50 Gwei
    };

    // const contract = await deployContract(
    //     connectedWallet,
    //     crossChainDAOJson,
    //     [governanceToken,
    //         chain.gateway,
    //         chain.gasReceiver,
    //         encodedSpokeChainIds,
    //         encodedSpokeChainNames
    //     ],
    //     options
    // );

    console.log(`Cross chain DAO has been deployed at ${contract.address}`);
}

async function estimateGas(contractJson: any, hubChain: any, governanceToken: string/*, _wallet: any*/) {
    const chain = chains.find((chain: any) => chain.name === hubChain);
    console.log(`Estimating Gas for ${chain.name} deployment.`);
    const provider = getDefaultProvider(chain.rpc);
    //const connectedWallet = _wallet.connect(provider);

    const gas = await estimateGasForDeploy(contractJson, [governanceToken,
        chain.gateway,
        chain.gasReceiver,
        encodedSpokeChainIds,
        encodedSpokeChainNames]);
    console.log(`Gas for this contract deploy for ${chain.name} is ${gas}`);
    return gas;

    // const gas = await estimateGasTestnet(contractJson, hubChain, [
    //     governanceToken,
    //     chain.gateway,
    //     chain.gasReceiver,
    //     encodedSpokeChainIds,
    //     encodedSpokeChainNames]);
    // console.log(`Gas for this contract deploy for ${chain.name} is ${gas}`);
    // return gas;
}

async function deployConstant(_hubChain: string, wallet: any, governanceToken: string , _gasLimit: any) {
    const chain = chains.find((chain: any) => chain.name === _hubChain);
    console.log(`Deploying CrossChainDAO for ${chain.name}.`);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);
    //const myGasLimit = BigNumber.from(_gasLimit);
    //const gasPriceWei = ethers.utils.parseUnits(_gasLimit.toString(), 'wei');

    const myGasLimit2 = _gasLimit;

    //const options = { 800000 };

    const contract = await deployContractConstant(
        chain.constAddressDeployer,
        connectedWallet,
        crossChainDAOJson,
        'crossChainDAO',
        [governanceToken,
            chain.gateway,
            chain.gasReceiver,
            encodedSpokeChainIds,
            encodedSpokeChainNames],
        //defaultAbiCoder.encode(['string'], [chain.name]),
        myGasLimit2
    );
    // chain.contract = contract;
    // console.log(`Deployed Satellite for ${chain.name} at ${chain.contract.address}`);
    //chain.contract = contract;
    console.log(`Deployed CrossChainDAO for ${chain.name} at ${contract.address}`);
}

const estimateGasTestnet = async (contractJson: any, _hubChain: string, args: any[]) => {
    const chain = chains.find((chain: any) => chain.name === _hubChain);
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

async function interact(hubChain: string, wallet: any, daoAddr: string) {
    const chain = chains.find((chain: any) => chain.name === hubChain);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);

    const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
    const crossChainDAOInstance = crossChainDAOFactory.attach(daoAddr);

    const result = await crossChainDAOInstance.spokeChainNames(1);
    //const result2 = await governanceTokenInstance.spokeChainNames(0);
    console.log(result);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

