import { utils, constants, BigNumber, getDefaultProvider } from 'ethers';
import { ethers } from "ethers";
import fs from "fs/promises";
const { defaultAbiCoder } = utils;
const { deployUpgradable } = require("@axelar-network/axelar-gmp-sdk-solidity");
const { utils: {
    deployContract
} } = require("@axelar-network/axelar-local-dev");

//import * as GovernanceToken from "../artifacts/contracts/GovernanceToken.sol/GovernanceToken.json" ;
const GovernanceToken = require("../artifacts/contracts/GovernanceToken.sol/GovernanceToken.json");
const ExampleProxy = require("../artifacts/contracts/ExampleProxy.sol/ExampleProxy.json");
//import * as ExampleProxy from "../artifacts/contracts/ExampleProxy.sol/ExampleProxy.json";
import { isTestnet, wallet } from "../config/constants";

const name = 'KingToken';
const symbol = 'KT';
const decimals = 13;


let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");
// import localChainsRaw from "../config/local.json";
// import testnetChainsRaw from "../config/testnet.json";

// const chains = isTestnet ? testnetChainsRaw : localChainsRaw;


const chainNames2 = ["Fantom", "Polygon", "Avalanche"];

const chainsInfo: any = [];


async function deploy(chain: any, wallet: any) {
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
        'governance-token',
    );
    chain.contract = contract;
    console.log(`Deployed Governance Token for ${chain.name} at ${chain.contract.address}.`);
}

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

async function execute(chains: any, wallet: any, options: any) {
    const args = options.args || [];
    const { source, destination, calculateBridgeFee } = options;
    const amount = parseInt(args[2]) || 1e5;

    async function print() {
        console.log(`Balance at ${source.name} is ${await source.contract.balanceOf(wallet.address)}`);
        console.log(`Balance at ${destination.name} is ${await destination.contract.balanceOf(wallet.address)}`);
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const initialBalance = await destination.contract.balanceOf(wallet.address);
    console.log('--- Initially ---');
    await print();

    const fee = await calculateBridgeFee(source, destination);
    await (await source.contract.giveMe(amount)).wait();
    console.log('--- After getting some token on the source chain ---');
    await print();

    await (
        await source.contract.transferRemote(destination.name, wallet.address, amount, {
            value: fee,
        })
    ).wait();

    while (true) {
        const updatedBalance = await destination.contract.balanceOf(wallet.address);
        if (updatedBalance.gt(initialBalance)) break;
        await sleep(2000);
    }

    console.log('--- After ---');
    await print();


}

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
        await deploy(chainInfo, wallet);
        // cnIndex += 1;
    }

    // const result = await Promise.all(promises);
    //  return result;

    // Promise.all(promises).then((values) => {
    //     return values;
    // })

    //update chains
    // chainInfo = _.values(chainInfo);

    // if (isTestnet) {
    //     await fs.writeFile("config/testnet.json", JSON.stringify(result, null, 2),);
    // } else {
    //     await fs.writeFile("config/local.json", JSON.stringify(result, null, 2),);
    // }
}


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
// module.exports = {
//     deploy,
//     execute
// };



