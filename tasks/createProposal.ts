import { utils, constants, BigNumber, getDefaultProvider } from 'ethers';
import { ethers } from "ethers";

import fs from "fs/promises";
import { CrossChainDAO, CrossChainDAO__factory, GovernanceToken, GovernanceToken__factory, SimpleIncrementer__factory } from '../typechain-types';
import { parseEther } from "ethers/lib/utils";
import { isTestnet, wallet } from "../config/constants";

import {
  AxelarQueryAPI,
  Environment,
  EvmChain,
  GasToken,
} from "@axelar-network/axelarjs-sdk";
import { result } from 'lodash';

const { defaultAbiCoder } = utils;

let chains = isTestnet ? require("../config/testnet.json") : require("../config/local.json");


let governanceTokenAddr = "0x22eA0B5104cfa244960cF1957E60Adc2B3aC9047";
let DAOAddress = "0xE876087C736d1108BBe256bB255dbeF3c13525b8";
let satelliteAddr = "0x412df091D549Ff8C3E7d538DBa2e0B5d0eA895eb";

const daoInteractAddress = "0x4796e4dd4dEaE309D6bA19c6b42c5a7cc77d2537";

//const spokeChainNames = ["Moonbeam", "Avalanche", "Ethereum", "Fantom", "Polygon"];

const spokeChainNames = ["Fantom", "Avalanche"];
const spokeChainIds: any = [];

let hubChain = 'Polygon';

const chain = chains.find((chain: any) => chain.name === hubChain);
const provider = getDefaultProvider(chain.rpc);
const connectedWallet = wallet.connect(provider);

let troll: any = [];
export async function main() {

  const receiverChains = [EvmChain.FANTOM, EvmChain.AVALANCHE];
  const sender = EvmChain.POLYGON;
  const gasToken = GasToken.MATIC;

  (async () => {

    const api = new AxelarQueryAPI({ environment: Environment.TESTNET });

    let feesArr: any = []
    for (let i = 0; i < receiverChains.length; i++) {
      // Calculate how much gas to pay to Axelar to execute the transaction at the destination chain
      let result = await api.estimateGasFee(
        sender,
        receiverChains[i],
        gasToken,
        500000,
        1
      );
      //let result = getGasFee(sender, receiverChains[i], gasToken);
      feesArr.push(result);
      //console.log(result)
    }
    let fees = await feesArr;
    console.log(fees);
    //await createProposal('Proposal for me to be given 1000 BNB!', fees);

    let totalFees: BigNumber  = ethers.BigNumber.from(0);
    for (let i = 0; i < fees.length; i++) {
      let number: BigNumber = ethers.BigNumber.from(fees[i])
      totalFees = totalFees.add(number);
    }

    console.log(totalFees.toString())

    const totalFeesInWei = ethers.utils.parseEther(totalFees.toString());

    //const bufferFees = totalFees * 1.3;

    const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
    const crossChainDAOInstance = crossChainDAOFactory.attach(DAOAddress);

    const incrementerFactory = new SimpleIncrementer__factory(connectedWallet);

    const incrementerInstance = incrementerFactory.attach(daoInteractAddress)

    const incrementData = incrementerInstance.interface.encodeFunctionData("increment",)

    const targets = [incrementerInstance.address];
    const values = [0];
    const callDatas = [incrementData];

    console.log('creatingProposal...')

    let description = 'Proposal for me to be given 1000 BNB!'

    //const tx = await crossChainDAOInstance.crossChainPropose(targets, values, callDatas, description, satelliteAddr, feesArray, { value: "10000000000000000000" })
    const tx = await crossChainDAOInstance.crossChainPropose(targets, values, callDatas, description, satelliteAddr, fees, { value: totalFees })
    const result = await tx.wait();
    console.log(`Proposal created at this transaction hash: ${result.transactionHash}`);
  })();
}


async function createProposal(description: string, feesArray: any[]) {


  // const crossChainDAOFactory = new CrossChainDAO__factory(connectedWallet);
  // const crossChainDAOInstance = crossChainDAOFactory.attach(DAOAddress);

  // const incrementerFactory = new SimpleIncrementer__factory(connectedWallet);
  // console.log('Deploying Incrementer....')
  // const incrementerContract = await incrementerFactory.deploy();
  // console.log('deployed!')
  // const incrementer = incrementerFactory.attach(incrementerContract.address)

  // const incrementData = incrementerContract.interface.encodeFunctionData("increment",)

  // const targets = [incrementerContract.address];
  // const values = [0];
  // const callDatas = [incrementData];

  // console.log('creatingProposal...')

  // const tx = await crossChainDAOInstance.crossChainPropose(targets, values, callDatas, description, satelliteAddr, feesArray, { value: "10000000000000000000" })
  // const result = await tx.wait();
  // console.log("Proposal created");
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

