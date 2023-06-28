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

let chainsInfo: any = [];

let hubChain = "Aurora";

let governanceTokenAddr = "0xF3701c7dAAa71f3622a47e49Cc0C1Dfae8C6Ce4c";
let campaignSatelliteAddr = "0x47A62Af19657263E3E0b60312f97F7464F70Ba35";

//let spokeChain = "Moonbeam";


async function deploy(_hubChain: string, chain: any, wallet: any) {
    console.log(`Deploying Campaign Satellite for ${chain.name}.`);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);
    const contract = await deployUpgradable(
        chain.constAddressDeployer,
        connectedWallet,
        campaignSatellite,
        ExampleProxy,
        [_hubChain, chain.gateway, chain.gasReceiver],
        [],
        //defaultAbiCoder.encode(['string'], [chain.name]),
        defaultAbiCoder.encode(['string'], [chain.name]),
        'campaignSatellite'
    );
    chain.contract = contract;
    console.log(`Deployed Campaign Satellite for ${chain.name} at ${chain.contract.address}.`);
}

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

        console.log(`Deploying [${chainName}]`);

        await deploy(hubChain, chainInfo, wallet);

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