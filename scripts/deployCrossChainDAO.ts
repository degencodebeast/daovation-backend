import { utils, constants, BigNumber, getDefaultProvider } from 'ethers';
import { ethers } from "hardhat";
//import { ethers } from "ethers";

import fs from "fs/promises";
import { CrossChainDAO, CrossChainDAO__factory, GovernanceToken, GovernanceToken__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

const { defaultAbiCoder } = utils;

const { deployUpgradable } = require("@axelar-network/axelar-gmp-sdk-solidity");
const { utils: {
    deployContract
} } = require("@axelar-network/axelar-local-dev");

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

let GovernanceTokenAddr = "0xF3701c7dAAa71f3622a47e49Cc0C1Dfae8C6Ce4c";
const BinanceDAOAddr = "0x558388D8Ebcf227D6cF1C1b8345754259800CA3F"

//const spokeChainNames = ["Moonbeam", "Avalanche", "Ethereum", "Fantom", "Polygon"];

const spokeChainNames = ["Polygon", "Avalanche"];
const spokeChainIds: any = [];

const HubChain = "Binance";
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


    await crossChainDAODeploy(HubChain, wallet, GovernanceTokenAddr);
    //await interact("Moonbeam", wallet, BinanceDAOAddr);


}

async function crossChainDAODeploy(hubChain: any, wallet: any, governanceToken: string) {
    const chain = chains.find((chain: any) => chain.name === hubChain);

    console.log(`Deploying CrossChainDAO for ${chain.name}.`);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);

    const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
    const contract: CrossChainDAO = await crossChainDAOFactory.deploy(
        governanceToken,
        chain.gateway,
        chain.gasReceiver,
        encodedSpokeChainIds,
        encodedSpokeChainNames
    );
    const deployTxReceipt = await contract.deployTransaction.wait();
    console.log(`Cross chain DAO has been deployed at ${contract.address}`);
}

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

