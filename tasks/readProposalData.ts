import { utils, constants, BigNumber, getDefaultProvider} from 'ethers';
import { ethers } from "ethers";

import fs from "fs/promises";
import { CrossChainDAO, CrossChainDAO__factory, GovernanceToken, GovernanceToken__factory, SimpleIncrementer__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

const {defaultAbiCoder} = utils;



let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

let governanceTokenAddr = "0x22eA0B5104cfa244960cF1957E60Adc2B3aC9047";
let DAOAddress = "0xaa5E388750c464a7f231f28Fff0a0607203C7c26";
let satelliteAddr = "0xD69E106223f50C6FCDD5B74Ba8c1bD0929cDf4fd";

//const spokeChainNames = ["Moonbeam", "Avalanche", "Ethereum", "Fantom", "Polygon"];

const spokeChainNames = ["Fantom", "Avalanche"];
const spokeChainIds:any = [];ethers

let hubChain = 'Polygon'

const chain = chains.find((chain: any) => chain.name === hubChain);
const provider = getDefaultProvider(chain.rpc);
const connectedWallet = wallet.connect(provider);

const PolygonDAOAddr = "0x5d58EaF49B52A8Bf4C07B7D3517aB7BC04844D5e";


export async function main() {
    await readDAOData();
   
}


async function readDAOData() {

    
    const crossChainDAOFactory =  new CrossChainDAO__factory(connectedWallet);
    const crossChainDAOInstance = crossChainDAOFactory.attach(PolygonDAOAddr);

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

  