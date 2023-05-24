
import { isTestnet, wallet } from "../config/constants";
import { getDefaultProvider, ethers, Wallet} from 'ethers';
import { CrossChainDAO__factory, DAOSatellite__factory } from '../typechain-types'; //TODO:
import {
    AxelarQueryAPI,
    Environment,
    EvmChain,
    GasToken,
  } from "@axelar-network/axelarjs-sdk";
//import { getGasFee } from "../utils/getGasFee";
import { getEnabledCategories } from "trace_events";
import { Squid } from "@0xsquid/sdk";
import * as fs from 'fs';

const getSDK = (): Squid => {
    const squid = new Squid({
      baseUrl: "https://testnet.api.0xsquid.com"
    });
    return squid;
  };
// const fs = require("fs-extra");
// require("dotenv").config()
let hubChain = "Binance";
let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

const getEnvironment = () => {
    let environment: Environment;
    isTestnet ? environment = Environment.TESTNET : environment = Environment.DEVNET;
    return environment;
} 

const privateKey =
  "0xd00adce3c9e315a9af8876e6175144e1ccf31c80600020c81e6211de6011063b";
const maticRpcEndPoint = 
"https://polygon-mumbai.g.alchemy.com/v2/Ksd4J1QVWaOJAJJNbr_nzTcJBJU-6uP3";


export async function swap() {
        // const chain = chains.find((chain: any) => chain.name === _chain);
        // const provider = getDefaultProvider(chain.rpc);
        // const signer = wallet.connect(provider);

        const provider = new ethers.providers.JsonRpcProvider(maticRpcEndPoint);
        const signer = new ethers.Wallet(privateKey, provider);
  
        
        // instantiate the SDK
        const squid = getSDK();
        // init the SDK
        await squid.init();
        console.log("Squid initiated");

        // log Squid supported tokens and chains
        //console.log("squid.tokens: \n", squid.tokens);
       
        //console.log("squid.chains: \n", squid.chains);

        const searchTokenSymbol = "MATIC";
        const searchChainName = "Polygon";

        const searchChainData = squid.chains.find(
            t =>
              t.chainId === squid.chains.find(c => c.chainName === searchChainName)?.chainId
          );

        const searchToken = squid.tokens.find(
            t =>
            t.symbol === searchTokenSymbol &&
            t.chainId === squid.chains.find(c => c.chainName === searchChainName)?.chainId
        );

        console.log("chainId for " + searchChainName + ": " + searchChainData?.chainId); //
        console.log("tokenAddress for " + searchTokenSymbol + 
          " on " + searchChainData?.networkName + ": " + searchToken?.address); 

        const params = {
        fromChain: 80001, // polygon testnet
        fromToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // WETH on Goerli
        fromAmount: "20000000000000000", // 0.05 WETH
        toChain: 43113, // Avalanche Fuji Testnet
        toToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // aUSDC on Avalanche Fuji Testnet
        toAddress: "0x8AadaC28D43369Cc93B172a47Eb1AAB57Cbe3d0c", // the recipient of the trade
        slippage: 1.00, // 1.00 = 1% max slippage across the entire route
        enableForecall: true, // instant execution service, defaults to true
        quoteOnly: false // optional, defaults to false
        };

        
        console.log("params: \n", params);

        const { route } = await squid.getRoute(params);
        console.log("route: \n", route);
        // console.log("route: \n", JSON.stringify(route, null, 2))

        const tx = await squid.executeRoute({signer, route });
        //console.log("tx: ", tx);
        
        const txReceipt = await tx.wait();
        console.log("txReciept: ", txReceipt);

        const getStatusParams = {
            transactionId: txReceipt.transactionHash,
            routeType: route.transactionRequest?.routeType
        };

        const status = await squid.getStatus(getStatusParams);
        console.log(status)
                
}


swap().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });



// const DAOSatelliteAddress:string = "0xd2f449C10c16C4395f00adE7287f29db2fedeA45" 
// //let sateliteChain = 'Moonbeam'
// const DAOaddress: string = ""




// export async function swap(_chain: string, wallet: any, satelliteAddr: string, proposalId: any, support: any) {
    
//     if(_chain == "Polygon" || _chain == "Avalanche") {
//         const chain = chains.find((chain: any) => chain.name === _chain);    
//         //const environment = getEnvironment();
//         //const gasFee = await getGasFee(chain.name, hubChain, chain.tokenSymbol,environment);
//         const provider = getDefaultProvider(chain.rpc);
//         const connectedWallet = wallet.connect(provider);

//         const daoSatelliteFactory = new DAOSatellite__factory(connectedWallet);
//         const daoSatelliteInstance = daoSatelliteFactory.attach(DAOSatelliteAddress);

//         const tx = await daoSatelliteInstance.castVote(proposalId, support);
//         const txReceipt = await tx.wait();
//         console.log(`You are connected on satellite ${_chain} and you cast vote for proposal: ${proposalId} and support: ${support}`);
//         console.log(`...tx: ${txReceipt.transactionHash}`);
//     }
//     else {
//         const chain = chains.find((chain: any) => chain.name === hubChain);
//         const provider = getDefaultProvider(chain.rpc);
//         const connectedWallet = wallet.connect(provider);
    
//         const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
//         const crossChainDAOInstance = crossChainDAOFactory.attach(DAOaddress);

//         const tx = await (await crossChainDAOInstance.castVote(proposalId, support)).wait();
//         //await tx.wait();
//         console.log(`You are connected on the hub ${_chain} and you cast vote for proposal: ${proposalId} and support: ${support}`);
//         console.log(`...tx: ${tx.transactionHash}`);
//     }


// }

// swap(hubChain, wallet, DAOSatelliteAddress, 90131400862826749252600494700950443919513985962496666511540165919520261089250, 2 ).catch((error) => {
//     console.error(error);
//     process.exitCode = 1;
//   });



