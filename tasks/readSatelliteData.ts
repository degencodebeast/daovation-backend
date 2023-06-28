import { utils, constants, BigNumber, getDefaultProvider } from 'ethers';
import { ethers } from "ethers";

import fs from "fs/promises";
import { CrossChainDAO, CrossChainDAO__factory, DAOSatellite__factory, GovernanceToken, GovernanceToken__factory, SimpleIncrementer__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

const { defaultAbiCoder } = utils;

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");


let governanceTokenAddr = "0xD7F2bbC67cBC880F8f7C99d9F24dE7bBe3243C4C";
let DAOAddress = "0xeE72F500671d7F8439c0b3B3c6a472CdA4BCb560";
let satelliteAddr = "0xc7FFF6CcC69249E89f3aeE092B1713ED2c65dE08";


//const spokeChainNames = ["Moonbeam", "Avalanche", "Ethereum", "Fantom", "Polygon"];

const spokeChainNames = ["Fantom", "Polygon"];
const spokeChainIds: any = [];

let hubChain = 'Aurora'

// const chain = chains.find((chain: any) => chain.name === hubChain);
// const provider = getDefaultProvider(chain.rpc);
// const connectedWallet = wallet.connect(provider);

function convertToUnits(_tx: any) {
    let arr: any = [];
    for (let i = 0; i < _tx.length; i++) {
        let result = Number(_tx[i]);
        arr.push(result);
    }
    return arr;
}

export async function main() {
    await readSatelliteData(spokeChainNames[1], wallet);

}

async function readSatelliteData(chainName: string, wallet: any) {
    const chain = chains.find((chain: any) => chain.name === chainName);
    const provider = getDefaultProvider(chain.rpc);
    const connectedWallet = wallet.connect(provider);

    const satelliteFactory = new DAOSatellite__factory(connectedWallet);
    const satelliteInstance = satelliteFactory.attach(satelliteAddr);

    //let spokeChainZero: any;

    try {
        // let tx = await satelliteInstance.getAllProposalIds();
        // console.log(convertToUnits(tx));
        let tx = await satelliteInstance.targetSecondsPerBlock();
        console.log(tx.toNumber())

    } catch (error) {
        console.log(`[source] DAOSatellite.getAllProposalIds() ERROR!`);
        console.log(`[source]`, error);

    }

    // try {
    //     const chainToQuery = spokeChainZero ?? 0;
    //     let addr = await crossChainDAOInstance.getTrustedRemoteAddress(chainToQuery);
    //     console.log(`[source] CrossChainDAO.getTrustedRemoteAddress(${chainToQuery}):`, addr);


    // } catch (error) {

    // }


}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

