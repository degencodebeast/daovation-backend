
import { isTestnet, wallet } from "../config/constants";
import { getDefaultProvider} from 'ethers';
import { CrossChainDAO__factory, DAOSatellite__factory } from '../typechain-types'; //TODO:

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

const DAOSatelliteAddress:string = "" 
//let sateliteChain = 'Moonbeam'
const DAOaddress: string = ""

let hubChain = "Binance";


export async function hasVoted(_chain: string, wallet: any, satelliteAddr: string, proposalId: any, support: any) {
    
    if(_chain == "Polygon" || _chain == "Avalanche") {
        const chain = chains.find((chain: any) => chain.name === _chain);
        const provider = getDefaultProvider(chain.rpc);
        const connectedWallet = wallet.connect(provider);

        const daoSatelliteFactory = new DAOSatellite__factory(connectedWallet);
        const daoSatelliteInstance = daoSatelliteFactory.attach(DAOSatelliteAddress);

        const hasVoted = await daoSatelliteInstance.hasVoted(proposalId, support)
        //await tx.wait();
        console.log(`You are connected on satellite ${_chain} and you voted for proposal: ${proposalId} and your voting status: ${hasVoted}`);
    }
    else {
        const chain = chains.find((chain: any) => chain.name === hubChain);
        const provider = getDefaultProvider(chain.rpc);
        const connectedWallet = wallet.connect(provider);
    
        const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
        const crossChainDAOInstance = crossChainDAOFactory.attach(DAOaddress);

        const hasVoted = await crossChainDAOInstance.hasVoted(proposalId, support)
        console.log(`You are connected on the hub ${_chain} and you cast vote for proposal: ${proposalId} and your voting status: ${hasVoted}`);
    }


}
