import { utils, constants, BigNumber, getDefaultProvider, Contract } from 'ethers';
import { ethers } from "hardhat";
//import { ethers } from "ethers";

import fs from "fs/promises";
import { CampaignSatellite__factory, CampaignSatellite} from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

const { defaultAbiCoder } = utils;

const { deployUpgradable } = require("@axelar-network/axelar-gmp-sdk-solidity");
const { utils: {
    deployContract
} } = require("@axelar-network/axelar-local-dev");

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");


//let SatelliteAddr = 

const spokeChainNames = ["Fantom", "Polygon"];
const campaignSatellite = require("../artifacts/contracts/CampaignSatellite.sol/CampaignSatellite.json");
const ExampleProxy = require("../artifacts/contracts/ExampleProxy.sol/ExampleProxy.json");
let targetSecondsPerBlockObj = require("../config/targetSecondsPerBlock.json");


let chainsInfo: any = [];

let hubChain = "Aurora";


let campaignManagerAddr = "0xfaEAc401400A66262CBBe90A37eDAB8CE48B3Ab4"
let campaignSatelliteAddr = "0xc514d8Fd3052E3D2aE793c1e95d4EFdA8Bb05d83"



//let spokeChain = "Moonbeam";


async function deploy(_hubChain: string, _hubChainAddr: string, chain: any, wallet: any,  targetSecondsPerBlock: number) {
    console.log(`Deploying Campaign Satellite for ${chain.name}.`);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);
    const contract = await deployUpgradable(
        chain.constAddressDeployer,
        connectedWallet,
        campaignSatellite,
        ExampleProxy,
        [_hubChain, _hubChainAddr, chain.gateway, chain.gasReceiver, targetSecondsPerBlock],
        [],
        //defaultAbiCoder.encode(['string'], [chain.name]),
        defaultAbiCoder.encode(['string'], [chain.name]),
        'campaignSatellitessss'
    );
    chain.contract = contract;
    console.log(`Deployed Campaign Satellite for ${chain.name} at ${chain.contract.address}.`);
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

        await deploy(hubChain, campaignManagerAddr, chainInfo, wallet, targetSecond);

    }

    //await interact(spokeChain, wallet, satelliteAddr)

}

async function interact(_spokeChain: string, wallet: any, satelliteAddr: string) {
    const chain = chains.find((chain: any) => chain.name === _spokeChain);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);

    const campaignSatelliteFactory = new CampaignSatellite__factory(connectedWallet);
    const campaignSatelliteInstance = campaignSatelliteFactory.attach(satelliteAddr);


}


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});