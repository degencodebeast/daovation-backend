
import { isTestnet, wallet } from "../config/constants";
import { getDefaultProvider} from 'ethers';
import { CrossChainDAO__factory, DAOSatellite__factory } from '../typechain-types'; //TODO:
import {
    AxelarQueryAPI,
    Environment,
    EvmChain,
    GasToken,
  } from "@axelar-network/axelarjs-sdk";
//import { getGasFee } from "../utils/getGasFee";
import { getEnabledCategories } from "trace_events";


let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

const getEnvironment = () => {
    let environment: Environment;
    isTestnet ? environment = Environment.TESTNET : environment = Environment.DEVNET;
    return environment;
} 



const DAOSatelliteAddress:string = "0xd2f449C10c16C4395f00adE7287f29db2fedeA45" 
//let sateliteChain = 'Moonbeam'
const DAOaddress: string = ""

let hubChain = "Binance";


export async function vote(_chain: string, wallet: any, satelliteAddr: string, proposalId: any, support: any) {
    
    if(_chain == "Polygon" || _chain == "Avalanche") {
        const chain = chains.find((chain: any) => chain.name === _chain);    
        //const environment = getEnvironment();
        //const gasFee = await getGasFee(chain.name, hubChain, chain.tokenSymbol,environment);
        const provider = getDefaultProvider(chain.rpc);
        const connectedWallet = wallet.connect(provider);

        const daoSatelliteFactory = new DAOSatellite__factory(connectedWallet);
        const daoSatelliteInstance = daoSatelliteFactory.attach(DAOSatelliteAddress);

        const tx = await daoSatelliteInstance.castVote(proposalId, support);
        const txReceipt = await tx.wait();
        console.log(`You are connected on satellite ${_chain} and you cast vote for proposal: ${proposalId} and support: ${support}`);
        console.log(`...tx: ${txReceipt.transactionHash}`);
    }
    else {
        const chain = chains.find((chain: any) => chain.name === hubChain);
        const provider = getDefaultProvider(chain.rpc);
        const connectedWallet = wallet.connect(provider);
    
        const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
        const crossChainDAOInstance = crossChainDAOFactory.attach(DAOaddress);

        const tx = await (await crossChainDAOInstance.castVote(proposalId, support)).wait();
        //await tx.wait();
        console.log(`You are connected on the hub ${_chain} and you cast vote for proposal: ${proposalId} and support: ${support}`);
        console.log(`...tx: ${tx.transactionHash}`);
    }


}

vote(hubChain, wallet, DAOSatelliteAddress, 90131400862826749252600494700950443919513985962496666511540165919520261089250, 2 ).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
