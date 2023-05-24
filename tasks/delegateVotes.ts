import { utils, constants, BigNumber, getDefaultProvider, Contract} from 'ethers';
import { ethers } from "ethers";

import fs from "fs/promises";
import { CrossChainDAO, CrossChainDAO__factory, GovernanceToken__factory, SimpleIncrementer__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

const {defaultAbiCoder} = utils;
const GovernanceToken = require("../artifacts/contracts/GovernanceToken.sol/GovernanceToken.json");




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
    await delegateVote();
}

async function delegateVote() {
    
    const governanceToken =  new GovernanceToken__factory(connectedWallet);
    const token = governanceToken.attach(GovernanceTokenAddr);

    console.log('checking voting power and balance....\n ***************')
    const votePower_1 = await token.getVotes(connectedWallet.address);
    console.log(`Voting Power for account: ${connectedWallet.address}: ${ethers.utils.formatEther(votePower_1)} units`)
    
    console.log('Delegating Votes...')

    const result = await (await token.delegate(connectedWallet.address)).wait();
    console.log('Votes Delegated!')

    console.log('checking voting power and balance....\n ***************')
    const votePower_2 = await token.getVotes(connectedWallet.address);
    console.log(`Voting Power for account: ${connectedWallet.address}: ${ethers.utils.formatEther(votePower_2)} units`)
    
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

  