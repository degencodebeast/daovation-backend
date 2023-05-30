import { utils, constants, BigNumber, getDefaultProvider} from 'ethers';
import { ethers } from "ethers";

import fs from "fs/promises";
import { CrossChainDAO, CrossChainDAO__factory, GovernanceToken, GovernanceToken__factory, SimpleIncrementer__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

const {defaultAbiCoder} = utils;



let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

let GovernanceTokenAddr = "0x63C69067938eB808187c8cCdd12D5Bcf0375b2Ac";
const moonBeamDAOAddr = "0x1dDabA87ec15241eEAC057FBC37C5F00CeBCEd34"

//const spokeChainNames = ["Moonbeam", "Avalanche", "Ethereum", "Fantom", "Polygon"];

const spokeChainNames = ["Moonbeam", "Avalanche"];
const spokeChainIds:any = [];ethers

let hubChain = 'Moonbeam'

const chain = chains.find((chain: any) => chain.name === hubChain);
const provider = getDefaultProvider(chain.rpc);
const connectedWallet = wallet.connect(provider);


export async function main() {
    await readDAOData();
   
}


async function readDAOData() {

    
    const crossChainDAOFactory =  new CrossChainDAO__factory(connectedWallet);
    const crossChainDAOInstance = crossChainDAOFactory.attach(moonBeamDAOAddr);

    let spokeChainZero: any;
    
    try {
        spokeChainZero = await crossChainDAOInstance.spokeChains(0);
        console.log(`[source] crossChainDAOInstance.spokeChains(0):`, spokeChainZero);
        
    } catch (error) {
        console.log(`[source] CrossChainDAO.spokeChains ERROR!`);
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

  