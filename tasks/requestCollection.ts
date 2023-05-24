
import { isTestnet, wallet } from "../config/constants";
import { getDefaultProvider} from 'ethers';
import { CrossChainDAO__factory, DAOSatellite__factory } from '../typechain-types'; //TODO:



let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

const DAOSatelliteAddress:string = "" 
//let sateliteChain = 'Moonbeam'
const DAOAddress: string = ""

let hubChain = "Binance";

    

export async function requestCollections(_chain: string, wallet: any, satelliteAddr: string, proposalId: any) {

        const chain = chains.find((chain: any) => chain.name === _chain);
        const provider = getDefaultProvider(chain.rpc);
        const connectedWallet = wallet.connect(provider);

        const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
        const crossChainDAOInstance = crossChainDAOFactory.attach(DAOAddress);

        const tx = await crossChainDAOInstance.requestCollections(proposalId, satelliteAddr, { value: "10000000000000000" });
        const txReceipt = await tx.wait();
        console.log("You just requested collections of votes from all spoke chains");
        console.log(`...tx: ${txReceipt.transactionHash}`);



}
