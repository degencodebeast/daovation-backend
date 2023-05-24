import { utils, constants, BigNumber, getDefaultProvider } from 'ethers';
import { ethers } from "ethers";

import fs from "fs/promises";
import { CrossChainDAO, CrossChainDAO__factory, GovernanceToken, GovernanceToken__factory, SimpleIncrementer__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

const { defaultAbiCoder } = utils;

const satelliteAddr: any = "0x47A62Af19657263E3E0b60312f97F7464F70Ba35";

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");

let GovernanceTokenAddr = "0x63C69067938eB808187c8cCdd12D5Bcf0375b2Ac";
const BinanceDAOAddr = "0x558388D8Ebcf227D6cF1C1b8345754259800CA3F"

//const spokeChainNames = ["Moonbeam", "Avalanche", "Ethereum", "Fantom", "Polygon"];

const spokeChainNames = ["Polygon", "Avalanche"];
const spokeChainIds: any = []; ethers

let hubChain = 'Binance';

const chain = chains.find((chain: any) => chain.name === hubChain);
const provider = getDefaultProvider(chain.rpc);
const connectedWallet = wallet.connect(provider);





export async function main() {
  await createProposal('Proposal for me to be given 100 BNB!');


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

  const result = await (await crossChainDAOInstance.crossChainPropose(targets, values, callDatas, description, satelliteAddr, { value: "10000000000000000" })).wait();
  const proposalCreatedEvents = result.events?.filter((event: any) => event.event === 'ProposalCreated');

  if (proposalCreatedEvents && proposalCreatedEvents.length > 0) {
    // @ts-ignore
    const proposalId = proposalCreatedEvents[0].args.proposalId;


    console.log("Proposal ID:", proposalId.toString());
  } else {
    console.log("No 'ProposalCreated' events found in the result.");
  }


}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

