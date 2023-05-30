import { utils, constants, BigNumber, getDefaultProvider } from 'ethers';
import { ethers } from "ethers";

import fs from "fs/promises";
import { CrossChainDAO, CrossChainDAO__factory, DAOSatellite__factory, GovernanceToken, GovernanceToken__factory, SimpleIncrementer__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

const { defaultAbiCoder } = utils;



let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

let governanceTokenAddr = "0x7694249fee47Ea83ad709a2e3A25316c4435Fa54";
let DAOAddress = "0x4c6E030CFD6B8f280C72E28347CD3E9177e8BF7E";
let satelliteAddr = "0xa23f9EA386C03DA4114d80DA80fb64DF544D28dF";



//const spokeChainNames = ["Moonbeam", "Avalanche", "Ethereum", "Fantom", "Polygon"];

const spokeChainNames = ["Fantom", "Avalanche"];
const spokeChainIds: any = [];

let hubChain = 'Polygon'

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
        let tx = await satelliteInstance.getAllProposalIds();
        console.log(convertToUnits(tx));

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

