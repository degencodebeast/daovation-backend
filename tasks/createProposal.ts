import { utils, constants, BigNumber, getDefaultProvider } from 'ethers';
import { ethers } from "ethers";

import fs from "fs/promises";
import { CrossChainDAO, CrossChainDAO__factory, GovernanceToken, GovernanceToken__factory, SimpleIncrementer__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

const { defaultAbiCoder } = utils;

const satelliteAddr: any = "0xa23f9EA386C03DA4114d80DA80fb64DF544D28dF";

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

let GovernanceTokenAddr = "0x7694249fee47Ea83ad709a2e3A25316c4435Fa54";
const BinanceDAOAddr = "0x4c6E030CFD6B8f280C72E28347CD3E9177e8BF7E"





//const spokeChainNames = ["Moonbeam", "Avalanche", "Ethereum", "Fantom", "Polygon"];

const spokeChainNames = ["Fantom", "Avalanche"];
const spokeChainIds: any = [];

let hubChain = 'Polygon';

const chain = chains.find((chain: any) => chain.name === hubChain);
const provider = getDefaultProvider(chain.rpc);
const connectedWallet = wallet.connect(provider);





export async function main() {
  await createProposal('Proposal for me to be given 1000 BNB!');


}



async function createProposal(description: string) {


  const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
  const crossChainDAOInstance = crossChainDAOFactory.attach(BinanceDAOAddr);

  const incrementerFactory = new SimpleIncrementer__factory(connectedWallet);
  console.log('Deploying Incrementer....')
  const incrementerContract = await incrementerFactory.deploy();
  console.log('deployed!')
  const incrementer = incrementerFactory.attach(incrementerContract.address)

  const incrementData = incrementerContract.interface.encodeFunctionData("increment",)

  const targets = [incrementerContract.address];
  const values = [0];
  const callDatas = [incrementData];

  console.log('creatingProposal...')

const tx = await crossChainDAOInstance.crossChainPropose(targets, values, callDatas, description, satelliteAddr, { value: "10000000000000000000" })
const result = await tx.wait();  
console.log("Proposal created");
// const proposalCreatedEvents = result.events?.filter((event: any) => event.event === 'ProposalCreated');

//   if (proposalCreatedEvents && proposalCreatedEvents.length > 0) {
    
//     const proposalId = proposalCreatedEvents[0].args?.proposalId;


//     console.log("Proposal ID:", proposalId.toString());
//   } else {
//     console.log("No 'ProposalCreated' events found in the result.");
//   }


}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

